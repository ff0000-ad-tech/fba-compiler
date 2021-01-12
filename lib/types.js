/**
 * Default fba-types & matching patterns
 *
 */
const FBA_IMAGES = {
	type: 'fbAi',
	include: /\.(png|jpg|gif|svg)(\?.*)?$/
}

const FBA_FONTS = {
	type: 'fbAf',
	include: /\.(ttf|woff)(\?.*)?$/
}

module.exports = {
	FBA_IMAGES,
	FBA_FONTS
}
