const compile = require('./main')

const assets = {
	images : [
		'./tests/rgba.png',
		'./tests/dog.png',
		'./tests/img0.jpg',
		'./tests/btnPlay.svg'		
	],
	fonts : [
		'./tests/Gotham-Bold_Subset.ttf'
	]
}

compile('review/300x250/', assets, true, true)



// const fs = require('fs-extra') 
// const extract = require('png-chunks-extract')

// fs.readFile('./review/fba_payload.working.png')
// 	.then((data) => {
// 		console.log('read')
// 		console.log(extract(data))
// 	})
// 	.catch(err => console.error(err))

