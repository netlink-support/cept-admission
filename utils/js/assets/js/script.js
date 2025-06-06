$(function(){
	
	var dropbox = $('#dropbox'),
		message = $('.message', dropbox);
		
    var image_id = "";
	
	dropbox.filedrop({
		// The name of the $_FILES entry:
		paramname:'imagefile1',
		data:{Upload:1},
		maxfiles: 3,
    	maxfilesize: 2,
		url: 'photo-gallery.php',
		
		uploadFinished:function(i,file,response)
		{
			//alert($.data(file).html());
			$.data(file).addClass('done');
			image_id = response.id;
			captions = "caption["+image_id+"]";
  			//$('.preview input[name=caption[]').attr('name',captions);
  $.data(file).append('<input name='+captions+' type="text" /><a href="post_file.php?deleteimage&id='+image_id+'">X</a>');
				
			//$.data(file).find('input[name=caption[]]').attr('name',captions);
			//textbox.attr('name',caption);
			// response is the JSON object that post_file.php returns
			
			
		},
		
    	error: function(err, file) 
		{
			switch(err) {
				case 'BrowserNotSupported':
					showMessage('Your browser does not support HTML5 file uploads!');
					break;
				case 'TooManyFiles':
					alert('Too many files! Please select 5 at most! (configurable)');
					break;
				case 'FileTooLarge':
					alert(file.name+' is too large! Please upload files up to 2mb (configurable).');
					break;
				default:
					break;
			}
		},
		
		// Called before each upload is started
		beforeEach: function(file){
			if(!file.type.match(/^image\//)){
				alert('Only images are allowed!');
				return false;
			}
		},
		
		uploadStarted:function(i, file, len)
		{
			createImage(file);
		},
		
		progressUpdated: function(i, file, progress) 
		{
			$.data(file).find('.progress').width(progress);
		}
    	 
	});
	
	var template = '<div class="preview">'+
						'<span class="imageHolder">'+
							'<img />'+
							'<span class="uploaded"></span>'+
						'</span>'+
						'<div class="progressHolder">'+
							'<div class="progress"></div>'+
						'</div>'+
					'</div>'; 
	
	function createImage(file)
	{

		var preview = $(template), 
			image = $('img', preview),
			textbox = $('input',preview);
		var reader = new FileReader();
		image.width = 100;
		image.height = 100;
		//alert(image_id);
		reader.onload = function(e)
		{
			// e.target.result holds the DataURL which
			// can be used as a source of the image:
			image.attr('src',e.target.result);
		};

		// Reading the file as a DataURL. When finished,
		// this will trigger the onload function above:
		reader.readAsDataURL(file);
		message.hide();
		preview.appendTo(dropbox);
		
		// Associating a preview container
		// with the file, using jQuery's $.data():
		$.data(file,preview);
	}
	function showMessage(msg)
	{
		message.html(msg);
	}

});