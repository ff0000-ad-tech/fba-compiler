// IMPORTS
const fs = require('fs')
const fx = require('fs-extra') // https://github.com/jprichardson/node-fs-extra
const crc32 = require('crc-32') // https://github.com/SheetJS/js-crc32
const struct = require('python-struct') // https://github.com/danielgindi/node-python-struct
const zlib = require('zlib')
const constants = require('pngjs/lib/constants')
const Packer = require('pngjs/lib/packer')
const path = require('path')
const mkdirp = require('mkdirp')
// const extract = require('png-chunks-extract')

// DEBUGGING
const debug = require('@ff0000-ad-tech/debug')
const log = debug('fba-compiler')
const log1 = debug('fba-compiler:+')
debug.disable('fba-compiler:+')

// -------------------------------------------------------------------------------------------------------------
const AVG_BYTE_PER_PIXEL = 0.101879816436
const chunkTypes = {
	count: 'fbAc',
	images: 'fbAi',
	fonts: 'fbAf'
}

let compileTypes
let totalAssets = 0
let totalByteWeight = 0
let imageDimensions = 0
let newChunks = []

let args
// -------------------------------------------------------------------------------------------------------------
const compile = _args => {
	args = _args
	/* TODO: Document args:
			{
				target: `${this.deploy.output.fba.path}/${this.deploy.output.fba.filename}`,
				assets: [{
					chunkType: {string}
					path: {string}
				}]
			}
	 */

	// reset properties
	newChunks = []
	// compileTypes = []
	// if (compileImages)
	// 	compileTypes.push('images')

	// if (compileFonts)
	// 	compileTypes.push('fonts')

	totalAssets = 0
	totalByteWeight = 0

	// assets total - if none, abort
	totalAssets = args.assets.length
	log1('TOTAL ASSETS:', totalAssets)
	if (totalAssets == 0) return

	// prepare the chunks
	return prepareNewChunks()
}

// -------------------------------------------------------------------------------------------------------------
const prepareNewChunks = () => {
	return new Promise((resolve, reject) => {
		log('FBA-Compiling ->')

		// iterate assets
		const promises = []
		args.assets.forEach(asset => {
			promises.push(packAsset(asset.chunkType, asset.path))
		})
		Promise.all(promises)
			.then(() => {
				// faux image size
				determineImageDimensions()

				// build png
				buildPng()

				// resolve
				resolve()
			})
			.catch(err => {
				reject(err)
			})
	})
}

// -------------------------------------------------------------------------------------------------------------
const packAsset = (chunkType, assetPath) => {
	/* TODO: Webpack already has loaded this asset, no need to reload it -- however,
			I couldn't find the raw buffer in the dependency graph.
			url-loader seems to be automatically base64-ing the source
	 */
	return fx
		.readFile(assetPath)
		.then(data => {
			// required order:
			// - fileNameSizeBA
			// - fileNameBA
			// - the asset byte array

			// get the file name
			const fileName = assetPath.substring(assetPath.lastIndexOf('/') + 1)
			// file name as a byte array
			const fileNameBA = Buffer.from(fileName)
			// calculate size of the file name string
			const fileNameSize = fileNameBA.length
			// file name size as a byte array
			const fileNameSizeBA = Buffer.from(struct.pack('!i', fileNameSize))

			// Full Asset:
			const fullAsset = Buffer.concat(
				[fileNameSizeBA, fileNameBA, data],
				// If totalLength is not provided, it is calculated from the Buffer instances in list.
				// This however causes an additional loop to be executed in order to calculate the totalLength,
				// so it is faster to provide the length explicitly if it is already known.
				fileNameSizeBA.length + fileNameBA.length + data.length
			)

			log(` ${assetPath}`)
			log1(' + chunk', chunkType)
			log1('    fileName:', fileName)
			log1('    fileNameBA:', fileNameBA.length, '|', fileNameBA)
			log1('    fileNameSize:', fileNameSize)
			log1('    fileNameSizeBA:', fileNameSizeBA.length, '|', fileNameSizeBA)
			log1('     - content_to_add:', fileName, data.length)

			packNewChunk(chunkType, fullAsset)
		})
		.catch(err => console.error(err))
}

// -------------------------------------------------------------------------------------------------------------
const packNewChunk = (chunkType, assetsBytes) => {
	log1('  ADDING ASSET CHUNK:', chunkType)

	// get chunk size of the packed asset
	const chunkSize = assetsBytes.length
	log1('\t\t chunkSize:', chunkSize)

	// increment total file weight by chunk size
	totalByteWeight += chunkSize

	// Type
	const chunkTypeBA = Buffer.from(chunkType)
	// Content is assetsBytes

	// Create a temporary byte array of the (Type + Content) for the CRC check.
	const chunkBytesLength = chunkTypeBA.length + assetsBytes.length
	const chunkBytes = Buffer.concat([chunkTypeBA, assetsBytes], chunkBytesLength)
	log1('\t\t chunk_bytes for CRC check:', chunkBytesLength)

	// CRC
	const crc = crc32.buf(chunkBytes)
	log1('\t\t\t crc:', crc)

	// put them all together into a full chunk buffer

	// Size
	const chunkSizeBA = Buffer.from(struct.pack('!i', chunkSize))
	// CRC
	const crcBA = struct.pack('!i', crc)

	// required order:
	// - Size
	// - Type
	// - Content
	// - CRC
	const fullChunkBA = Buffer.concat(
		[chunkSizeBA, chunkTypeBA, assetsBytes, crcBA],
		chunkSizeBA.length + chunkTypeBA.length + assetsBytes.length + crcBA.length
	)

	log1('   Weight:', chunkSize / 1024, 'kB (', chunkSize, 'bytes ), totalByteWeight:', totalByteWeight)
	log1('   Size[4]:', chunkSize / 1024, 'kB(', chunkSize, 'bytes )')
	log1('   Type[4]:', chunkType)
	log1('   Content[' + String(chunkSize) + ']')
	log1('   CRC[4]:', crc)
	log1('')

	// add to class level array
	newChunks.push(fullChunkBA)
}

// -------------------------------------------------------------------------------------------------------------
const packfbAc = () => {
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

// -------------------------------------------------------------------------------------------------------------
const determineImageDimensions = () => {
	const totalEstPixels = totalByteWeight / AVG_BYTE_PER_PIXEL
	imageDimension = Math.round(Math.sqrt(totalEstPixels))

	log1('New Chunks\n\ttotal bytes:', totalByteWeight)
	log1('\t totalEstPixels:', totalEstPixels)
	log1('\twidth/height:', imageDimension)
}

// -------------------------------------------------------------------------------------------------------------
const buildPng = () => {
	// Section exlogd from 'pngjs/lib/packer-sync'
	var packer = new Packer({})

	var chunks = []

	// Signature
	chunks.push(new Buffer(constants.PNG_SIGNATURE))

	// Header - IHDR
	chunks.push(packer.packIHDR(imageDimension, imageDimension))

	// INJECTION!!!
	// Asset Count - fbAc
	chunks.push(packfbAc())

	// fbAi and fbAf
	chunks = chunks.concat(newChunks)

	// IDAT
	var filteredData = packer.filterData(new Buffer(4 * imageDimension * imageDimension), imageDimension, imageDimension)
	// compress it
	var compressedData = zlib.deflateSync(filteredData, packer.getDeflateOptions())
	filteredData = null

	if (!compressedData || !compressedData.length) {
		throw new Error('bad png - invalid compressed data response')
	}
	chunks.push(packer.packIDAT(compressedData))

	// End - IEND
	chunks.push(packer.packIEND())

	log1('chunks:', chunks)

	var pngBuffer = Buffer.concat(chunks)

	// Emit
	log(` ${args.target}`)
	const targetPath = path.dirname(args.target)
	if (!fs.existsSync(targetPath)) {
		mkdirp.sync(targetPath)
	}
	fs.writeFile(args.target, pngBuffer, error => {
		if (error) throw error
	})

	// log1(Array(30).join('-~-'))
	// log1(extract(pngBuffer))
}

module.exports = {
	compile
}
