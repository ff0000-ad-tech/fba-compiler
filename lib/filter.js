const { createFilter } = require('rollup-pluginutils')

const types = require('./types.js')

const debug = require('@ff0000-ad-tech/debug')
const log = debug('fc:lib:filter')

/**
 * @param {fbaType[]} fbaTypes (required)
 * fbaType: {
 * 	type: 'fbAi' or 'fbAf',
 * 	include: [minimatch patterns],
 * 	exclude: [minimatch patterns]
 * }
 * patterns that can be used w/ rollup-plugin-utils' createFilter util
 * (see: https://github.com/rollup/rollup-pluginutils)

 * @param {aggregator} function (required)
 *	a callback that will store discovered fba-assets
 *
 */
const createFbaAggregator = (aggregator, fbaTypes = null) => {
	if (!aggregator) {
		throw new Error(`fba-compiler:lib:filter:createFbaAggregator requires an external aggregator function`)
	}
	// define valid fba-types
	fbaTypes = fbaTypes || [types.FBA_FONTS, types.FBA_IMAGES]

	// build getChunkType function once for speed
	const getChunkType = createGetChunkTypeFactory(fbaTypes)

	// return factory
	return (filepath) => {
		const chunkType = getChunkType(filepath)
		if (!chunkType) {
			return
		}
		// store fba asset-ref for later
		aggregator({
			chunkType,
			path: filepath
		})
	}
}

const createFilterFactory = (fbaType) => {
	const { include, exclude, type } = fbaType
	const filter = createFilter(include, exclude)
	return (importPath) => (filter(importPath) ? type : null)
}

const createGetChunkTypeFactory = (fbaTypes) => {
	const filters = fbaTypes.map(createFilterFactory)
	return (importPath) => {
		for (const filter of filters) {
			const type = filter(importPath)
			if (type) {
				return type
			}
		}
	}
}

module.exports = {
	createFbaAggregator
}
