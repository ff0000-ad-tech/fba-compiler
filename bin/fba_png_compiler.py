import re, os, shutil, copy, binascii, struct, json, math
from PIL import Image

import bin.models.model as model
import bin.models.process as prc
import bin.models.display_error as de

from bin.utilities import(
	utilities,
	shell
)

from bin import io

class FbaPngCompiler( object ):

	ad_app_state = None
	paths = None
	assets = None

	process_path = ''

	compile_assets = None
	payload = None

	payload_header = None
	payload_asets = None
	payload_bodyfooter = None

	trace_log = None
	errors = None

	total_assets = 0
	total_byte_weight = 0;
	avg_byte_per_pixel = 0.101879816436

	# DEBUG FLAG
	debug = False
	chunk_debug = False

	# -------------------------------------------------------------------------------------------------------------------------
	def __init__( self, ad_app_state, paths, assets ):
		self.ad_app_state = ad_app_state
		self.paths = paths
		self.assets = assets		

	# -------------------------------------------------------------------------------------------------------------------------
	def compile_binary_assets( self, size, compile_images=True, compile_fonts=True ):
		prc.Process( 'Generating Binary Payload...' ).flush()

		self.errors = []

		self.pointer = 0

		self.compile_assets = {
			'images': [],
			'fonts': []
		}

		self.blank_image = None

		self.bytes_read = 0
		self.total_byte_weight = 0

		self.chunk_types = {
			'count': 'fbAc',
			'images': 'fbAi',
			'fonts': 'fbAf'
		}

		# prepare temp path
		self.prepare_process_path( size ) 

		# images
		if compile_images:
			self.prepare_images( size )

		# fonts
		if compile_fonts:
			self.prepare_fonts( size )

		# assets total - if none, cleanup and abort
		self.get_total_assets()
		if self.total_assets == 0:
			self.cleanup_process_path()
			return

		# prepare the chunks
		self.prepare_new_chunks()

		# faux image size		
		self.determine_image_dimensions()

		# build png
		self.build_asset_png( size )

		# cleanup
		self.cleanup_process_path()

		return self.payload
	
	# -------------------------------------------------------------------------------------------------------------------------
	def prepare_process_path( self, size ):
		self.process_path = self.paths[ 'local_build_path' ] + size[ 'build_size' ] + '/fba_temp/'
		if not os.path.exists( self.process_path ):
			os.makedirs( self.process_path )

		if self.debug:
			print '\nPROCESS PATH:'
			print self.process_path

	# -------------------------------------------------------------------------------------------------------------------------
	def cleanup_process_path( self ):
		shutil.rmtree( self.process_path )

	# -------------------------------------------------------------------------------------------------------------------------
	def prepare_images( self, size ):
		# image assets for this size
		self.compile_assets[ 'images' ] = [
			self.paths[ 'local_build_path' ] + size[ 'build_size' ] + '/images/' + image_subpath
				for image_subpath in self.assets.get_images( size[ 'deploy_size' ] )
		]
		if self.debug:
			print '\nIMAGES TO COMPILE:'
			print json.dumps( self.compile_assets[ 'images' ], indent=2 )

	# -------------------------------------------------------------------------------------------------------------------------
	def prepare_fonts( self, size ):
		# font assets for this size
		for font_subpath in self.assets.get_fonts( size[ 'deploy_size' ] ):
			# create temp copy
			font_name = utilities.get_full_filename( font_subpath )
			shutil.copy(
				self.paths[ 'local_build_path' ] + model.html_redlib_folder_name + '/common/fonts/' + font_subpath,
				self.process_path + font_name
			)

			# apply IE patch
			result = shell.allow_font_embed( 
				self.ad_app_state,
				self.process_path + font_name 
			)
			if isinstance( result, de.DisplayError ):
				self.errors.append( result )

			# append asset path
			self.compile_assets[ 'fonts' ].append( 
				self.process_path + font_name 
			)

		if self.debug:
			print '\nFONTS TO COMPILE:'
			print json.dumps( self.compile_assets[ 'fonts' ], indent=2 )

	# =========================================================================================================================
	def get_total_assets( self ):
		self.total_assets = len( self.compile_assets[ 'images' ] ) + len( self.compile_assets[ 'fonts' ] )
		if self.debug:
			print'\nTOTAL ASSETS:', self.total_assets

	# =========================================================================================================================
	def prepare_new_chunks ( self ):
		if self.debug:
			print '\nPrepare all assets as hidden chunks'

		self.payload_asets = bytearray()

		# asset types
		binary_types = [ 
			'images', 
			'fonts' 
		]
		for binary_type in binary_types:
			if self.debug:
				print " BINARY TYPE:", binary_type

			# if no assets, skip adding chunks
			if len( self.compile_assets[ binary_type ] ) < 1:
				continue

			# iterate asset paths
			for asset_path in self.compile_assets[ binary_type ]:

				assets_bytes = self.pack_asset( asset_path )

				self.prepare_single_new_chunk( self.chunk_types[ binary_type ], assets_bytes )

	# -------------------------------------------------------------------------------------------------------------------------
	def pack_asset( self, asset_path ):		
		# empty byte array to write the file name and image data into
		assets_bytes = bytearray()

		# get the file name as a string
		file_name = str( os.path.basename( asset_path ) )
		# file name as a byte array
		file_name_BA = bytearray( file_name )
		# calculate size of the file name string
		file_name_size = len( file_name_BA )
		# write in the size first
		packed_byte_array = bytearray( struct.pack( '!i', file_name_size ) )
		assets_bytes.extend( packed_byte_array )
		# write in the file name string
		assets_bytes.extend( file_name_BA )

		if self.debug:
			print '  PACKING ASSET:', asset_path
			print '\t\t file_name:', file_name
			print '\t\t file_name_size:', file_name_size

		# asset content
		with open( asset_path, "rb" ) as f:
			bytes = bytearray( f.read() )
			assets_bytes.extend( bytes )

		return assets_bytes

	# -------------------------------------------------------------------------------------------------------------------------
	def prepare_single_new_chunk( self, chunk_type, assets_bytes ):
		if self.debug:
			print '  ADDING ASSET CHUNK:', chunk_type

		# get chunk size of the packed asset
		chunk_size = len( assets_bytes )

		### increment total file weight by chunk size
		self.total_byte_weight += chunk_size
			
		# Create a temporary byte array for the CRC check.
		chunk_bytes = bytearray()
		# Type
		chunk_bytes.extend( bytearray( chunk_type ) )
		# Content
		chunk_bytes.extend( assets_bytes )
		# CRC
		crc = binascii.crc32( chunk_bytes )

		# Add Chunk data to class level BA
		# Size
		self.payload_asets.extend( 
			bytearray( struct.pack( '!i', chunk_size ) ) 
		)
		# Type
		self.payload_asets.extend( 
			bytearray( chunk_type )
		)
		# Content
		self.payload_asets.extend( 
			assets_bytes
		)
		# CRC
		self.payload_asets.extend( 
			bytearray( struct.pack ( '!i', crc ) )	
		)

		if self.debug:
			print '   Weight:', ( chunk_size / 1024 ), 'kB (', chunk_size, 'bytes), total_byte_weight:', self.total_byte_weight
			print '   Size[ 4 ]:', ( chunk_size / 1024 ), 'kB(', chunk_size, 'bytes )'
			print '   Type[ 4 ]:', chunk_type
			print '   Content[ ' + str( chunk_size ) + ' ]'#, ':', assets_bytes
			print '   CRC[ 4 ]:', crc
			print ''

	# =========================================================================================================================
	# NEW
	def determine_image_dimensions( self ):
		total_est_pixels = self.total_byte_weight / self.avg_byte_per_pixel
		self.image_dimension = int( math.sqrt( total_est_pixels ) ) 
		if self.debug:
			print 'New Chunks\n\ttotal bytes:', self.total_byte_weight
			print '\ttotal_est_pixels:', total_est_pixels
			print '\twidth/height:', self.image_dimension
	
	# -------------------------------------------------------------------------------------------------------------------------
	def build_asset_png( self, size ):
		# create blank image
		blank_image_path = self.process_path + 'fba_payload.png'
		
		blank_image = Image.new( 'RGBA', ( self.image_dimension, self.image_dimension ), (0, 0, 0, 0) )
		blank_image.save( blank_image_path, format='PNG' )

		with open( blank_image_path, 'rb+' ) as f:
			self.payload = bytearray( f.read() )

		# Skip signature
		self.read_next_bytes( 8 )

		# Read through all chunks
		self.split_chunks() 
		
		# complete
		if self.debug:
			print ' - Reached End of the File'

	# -------------------------------------------------------------------------------------------------------------------------
	# Utility reading BYTES functions
	def read_next_bytes( self, byte_count ):
		position = self.pointer
		self.pointer += byte_count
		return self.payload[ position : self.pointer ]

	# =========================================================================================================================
	def split_chunks( self ):
		# read the bytes and covert to HEX then to INT
		chunk_size_BA = self.read_next_bytes( 4 )
		chunk_size = int( binascii.hexlify( chunk_size_BA ), 16 )

		# read the bytes and covert to ASCII
		chunk_type_BA = self.read_next_bytes( 4 )
		chunk_type = chunk_type_BA.decode( 'ascii' )

		content = self.read_next_bytes( chunk_size )

		crc_BA = self.read_next_bytes( 4 )
		crc = binascii.hexlify(crc_BA)

		self.payload_header = self.payload[ 0 : self.pointer ]
		
		# the header chunk has been read, now extract the 
		total_bytes = len( self.payload )
		
		self.payload_bodyfooter = self.payload[ self.pointer : total_bytes ]

		if self.chunk_debug:
			print 'Split Original chunks'
			print '\ttotal bytes:', total_bytes
			print '\tself.payload_header:', len( self.payload_header )		
			print '\tself.payload_bodyfooter:', len( self.payload_bodyfooter )
			
		
		self.rewrite_all_content_into_image()

	# =========================================================================================================================
	def rewrite_all_content_into_image( self ):
		self.payload = self.payload[ 0 : self.pointer ]
		if self.debug:
			print 'trim down to just signature and header'
			print '\tpayload length:', len( self.payload )

		# add the chunk for the asset count
		self.create_new_chunk_for_total()

		self.payload.extend( self.payload_asets )
		self.payload.extend( self.payload_bodyfooter )

	# =========================================================================================================================
	def create_new_chunk_for_total( self ):		
		chunk_type_BA = bytearray( self.chunk_types['count'] )
		chunk_count_BA = bytearray( struct.pack( '!i', self.total_assets ))
		
		if self.debug:
			print '\t\tcreate_new_chunk_for_total(), self.total_assets:', self.total_assets
			print '\t\t\t', self.chunk_types['count'], '\tSize: 4 bytes'
			print '\t\t\t', chunk_count_BA
			print '\t\t\tCreate temp chunk to calculate CRC'

		# Create a temporary byte array for the CRC check.
		tmp_bytes = bytearray()
		# Type
		tmp_bytes.extend( chunk_type_BA )
		# Content
		tmp_bytes.extend( chunk_count_BA )
		# CRC
		crc = binascii.crc32( tmp_bytes )
		
		# write in chunk
		# Size
		self.payload.extend( 
			bytearray( struct.pack( '!i', 4 ))
		)
		# Type & Content
		self.payload.extend( tmp_bytes )
		# CRC
		self.payload.extend( 
			bytearray( struct.pack( '!i', crc ))
		)

