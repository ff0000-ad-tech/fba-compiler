// IMPORTS
const fs = require('fs')
const path = require('path')
const mkdirp = require('mkdirp')

const zlib = require('zlib')
const constants = require('pngjs/lib/constants')
const Packer = require('pngjs/lib/packer')
// const extract = require('png-chunks-extract')

const packer = require('./packer.js')

// DEBUGGING
const debug = require('@ff0000-ad-tech/debug')
const log = debug('fc:lib:compiler')
const log1 = debug('fc:lib:compiler:+')
debug.disable('fc:lib:compiler:+')

/**
 * FBA Compiler
 *
 * 	fbaAssets: [{
 *		output: {path-to-fba-payload-file},
 *		chunkType: {string}
 *		path: {string}
 *	}]
 */
const compile = async (fbaAssets) => {
	if (fbaAssets.length == 0) {
		return
	}
	log(`FBA-Compiling ${fbaAssets.length} assets`)
	// prepare the chunks
	const targets = await prepareAssets(fbaAssets)
	// build png per target
	targets.map(async (target) => {
		buildPng(target)
	})
}

const prepareAssets = async (fbaAssets) => {
	// iterate assets
	let targets = []
	await Promise.all(
		fbaAssets.map(async (asset) => {
			const pack = await packer.packAsset(asset.path, asset.chunkType)
			targets = pushChunksToTarget(targets, asset.output, pack)
		})
	)
	return targets
}

const pushChunksToTarget = (targets, output, pack) => {
	const hasTarget = targets.find((target) => {
		if (target.output === output) {
			target.chunks = [...target.chunks, ...pack.chunk]
			target.totalAssets += 1
			target.totalBytes += pack.bytes
			return true
		}
	})
	if (!hasTarget) {
		targets.push({
			output,
			chunks: [pack.chunk],
			totalAssets: 1,
			totalBytes: pack.bytes
		})
	}
	return targets
}

// -------------------------------------------------------------------------------------------------------------
const buildPng = ({ output, chunks, totalAssets, totalBytes }) => {
	log1(`Building Target ${output}`)
	// faux image size
	const dim = packer.getPngDimension(totalBytes)
	// Section exlogd from 'pngjs/lib/packer-sync'
	const packer = new Packer({})
	const chunks = []
	// Signature
	chunks.push(new Buffer(constants.PNG_SIGNATURE))
	// Header - IHDR
	chunks.push(packer.packIHDR(dim, dim))
	// INJECTION!!!
	// Asset Count - fbAc
	chunks.push(packfbAc(totalAssets))
	// fbAi and fbAf
	chunks = chunks.concat(chunks)
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
	const targetPath = path.dirname(output)
	if (!fs.existsSync(targetPath)) {
		mkdirp.sync(targetPath)
	}
	fs.writeFile(output, pngBuffer, (error) => {
		if (error) {
			throw error
		}
	})
	// log1(Array(30).join('-~-'))
	// log1(extract(pngBuffer))
}

module.exports = {
	compile
}
