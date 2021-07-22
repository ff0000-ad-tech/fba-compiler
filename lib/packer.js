const path = require('path')

const fx = require('fs-extra') // https://github.com/jprichardson/node-fs-extra
const crc32 = require('crc-32') // https://github.com/SheetJS/js-crc32
const struct = require('python-struct') // https://github.com/danielgindi/node-python-struct

// DEBUGGING
const debug = require('@ff0000-ad-tech/debug')
const log = debug('fba-compiler:lib:packer')
const log1 = debug('fba-compiler:lib:packer:+')
debug.disable('fba-compiler:lib:packer:+')

const AVG_BYTE_PER_PIXEL = 0.101879816436
const chunkTypes = {
	count: 'fbAc',
	images: 'fbAi',
	fonts: 'fbAf'
}
/**
 * Prepare asset as byte array
 *
 * required order:
 * - fileNameSizeBA
 * - fileNameBA
 * - the asset byte array
 *
 */
const packAsset = async (assetPath, chunkType) => {
	/* TODO: Webpack already has loaded this asset, no need to reload it -- however,
			I couldn't find the raw buffer in the dependency graph.
			url-loader seems to be automatically base64-ing the source
	 */
	const data = await fx.readFile(assetPath)

	// get the file name
	const fileName = path.basename(assetPath)
	const fileNameBA = Buffer.from(fileName)

	// calculate size of the file name string
	const fileNameSize = fileNameBA.length
	const fileNameSizeBA = Buffer.from(struct.pack('!i', fileNameSize))

	log(` ${assetPath}`)
	log1(' + chunk', chunkType)
	log1('    fileName:', fileName)
	log1('    fileNameBA:', fileNameBA.length, '|', fileNameBA)
	log1('    fileNameSize:', fileNameSize)
	log1('    fileNameSizeBA:', fileNameSizeBA.length, '|', fileNameSizeBA)
	log1('     - content_to_add:', fileName, data.length)

	// Full Asset:
	const assetBA = Buffer.concat(
		[fileNameSizeBA, fileNameBA, data],
		// If totalLength is not provided, it is calculated from the Buffer instances in list.
		// This however causes an additional loop to be executed in order to calculate the totalLength,
		// so it is faster to provide the length explicitly if it is already known.
		fileNameSizeBA.length + fileNameBA.length + data.length
	)

	log1('  ADDING ASSET CHUNK:', chunkType)
	// get chunk size of the packed asset
	const chunkSize = assetBA.length
	log1('\t\t chunkSize:', chunkSize)

	// Create a temporary byte array of the (Type + Content) for the CRC check.
	const chunkTypeBA = Buffer.from(chunkType)
	const chunkBytesLength = chunkTypeBA.length + assetBA.length
	const chunkBytes = Buffer.concat([chunkTypeBA, assetBA], chunkBytesLength)
	log1('\t\t chunk_bytes for CRC check:', chunkBytesLength)

	// CRC
	const crc = crc32.buf(chunkBytes)
	log1('\t\t\t crc:', crc)

	// put them all together into a full chunk buffer
	// required order:
	// - Size
	// - Type
	// - Content
	// - CRC
	// Size
	const chunkSizeBA = Buffer.from(struct.pack('!i', chunkSize))
	const crcBA = struct.pack('!i', crc)
	const fullChunkBA = Buffer.concat(
		[chunkSizeBA, chunkTypeBA, assetBA, crcBA],
		chunkSizeBA.length + chunkTypeBA.length + assetBA.length + crcBA.length
	)

	log1('   Weight:', chunkSize / 1024, 'kB (', chunkSize, 'bytes )')
	log1('   Size[4]:', chunkSize / 1024, 'kB(', chunkSize, 'bytes )')
	log1('   Type[4]:', chunkType)
	log1('   Content[' + String(chunkSize) + ']')
	log1('   CRC[4]:', crc)
	log1('')

	const pack = {
		chunk: fullChunkBA,
		size: chunkSize
	}
	return pack
}

/**
 * Pack FBA Chunk header
 *
 */
const packfbAc = (totalAssets) => {
	// Creates a Chunk for the total asset count
	const chunkTypeBA = Buffer.from(chunkTypes['count'])
	const chunkCountBA = Buffer.from(struct.pack('!i', totalAssets))

	log1('\t\t packfbAc(), self.totalAssets:', totalAssets)
	log1('\t\t\t', chunkTypes['count'], '\tSize: 4 bytes')
	log1('\t\t\t', chunkCountBA)
	log1('\t\t\tCreate temp chunk to calculate CRC')

	// Create a temporary byte array for the CRC check.
	const tmpBytes = Buffer.concat([chunkTypeBA, chunkCountBA], chunkTypeBA.length + chunkCountBA.length)
	const crc = crc32.buf(tmpBytes)

	// write in chunk
	// Size
	const sizeBA = struct.pack('!i', 4)
	log1('sizeBA:', sizeBA.length)
	log1('tmpBytes:', tmpBytes.length)
	// CRC
	const crcBA = struct.pack('!i', crc)
	log1('crcBA:', crcBA.length)

	// order:
	// Size BA
	// Chunk Type BA
	// Content - Chunk Count BA
	// CRC BA
	return Buffer.concat([sizeBA, tmpBytes, crcBA], sizeBA.length + tmpBytes.length + crcBA.length)
}

const getPngDimension = (totalBytes) => {
	const totalEstPixels = totalBytes / AVG_BYTE_PER_PIXEL
	const dim = Math.round(Math.sqrt(totalEstPixels))
	log1('\ttotal bytes:', totalBytes)
	log1('\t totalEstPixels:', totalEstPixels)
	log1('\twidth/height:', dim)
	return dim
}

module.exports = {
	packAsset,
	packfbAc,
	getPngDimension
}
