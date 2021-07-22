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
const log = debug('fba-compiler:lib:compiler')
const log1 = debug('fba-compiler:lib:compiler:+')
debug.disable('fba-compiler:lib:compiler:+')

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
	const targets = await prepareAssets(fbaAssets)
	targets.map(async (target) => {
		buildPng(target)
	})
}

/**
 * Prepare Asset as FBA-ordered byte-array
 * and aggregate on specified output target.
 *
 */
const prepareAssets = async (fbaAssets) => {
	let targets = []
	await Promise.all(
		fbaAssets.map(async (asset) => {
			const pack = await packer.packAsset(asset.path, asset.chunkType)
			targets = pushChunksToTarget(targets, asset.output, pack)
		})
	)
	return targets
}

/**
 * Aggregate chunks on specified target
 *
 */
const pushChunksToTarget = (targets, output, pack) => {
	const hasTarget = targets.find((target) => {
		if (target.output === output) {
			target.chunks = [...target.chunks, pack.chunk]
			target.totalAssets += 1
			target.totalBytes += pack.size
			return true
		}
	})
	if (!hasTarget) {
		targets.push({
			output,
			chunks: [pack.chunk],
			totalAssets: 1,
			totalBytes: pack.size
		})
	}
	return targets
}

// -------------------------------------------------------------------------------------------------------------
const buildPng = ({ output, chunks, totalAssets, totalBytes }) => {
	log(`Emitting -> ${output}`)
	// faux image size
	const dim = packer.getPngDimension(totalBytes)
	// Section exlogd from 'pngjs/lib/packer-sync'
	const pngPacker = new Packer({})
	let buffers = []
	// Signature
	buffers.push(Buffer.from(constants.PNG_SIGNATURE))
	// Header - IHDR
	buffers.push(pngPacker.packIHDR(dim, dim))
	// INJECTION!!!
	// Asset Count - fbAc
	buffers.push(packer.packfbAc(totalAssets))
	// fbAi and fbAf
	buffers = buffers.concat(chunks)
	// IDAT
	var filteredData = pngPacker.filterData(Buffer.alloc(4 * dim * dim), dim, dim)
	// compress it
	var compressedData = zlib.deflateSync(filteredData, pngPacker.getDeflateOptions())
	filteredData = null
	if (!compressedData || !compressedData.length) {
		throw new Error('bad png - invalid compressed data response')
	}
	buffers.push(pngPacker.packIDAT(compressedData))
	// End - IEND
	buffers.push(pngPacker.packIEND())

	// Emit
	const targetPath = path.dirname(output)
	const fbaBuffer = Buffer.concat(buffers)
	if (!fs.existsSync(targetPath)) {
		mkdirp.sync(targetPath)
	}
	fs.writeFile(output, fbaBuffer, (error) => {
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
