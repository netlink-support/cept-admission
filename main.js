$(document).ready(
    function () {

        //Flickr Widget Footer
        $('#wrapper .flickr').jflickrfeed(
            {
                limit: 12,
                qstrings: {
                    set: '72157625760980704', nsid: '46901927@N06'
                },
                itemTemplate: '<li>'+
                '<a rel="prettyPhoto[flickr]" href="{{image}}" title="{{title}}">' +
                '<img src="{{image_s}}" alt="{{title}}" />' +
                '</a>' +
                '</li>'
            }, function (data) {
                $("a[rel^='prettyPhoto']").prettyPhoto();

                $("#wrapper .flickr li").hover(
                    function () {                         
                        $(this).find("img").stop(true, true).animate({ opacity: 0.5 }, 800);
                    }, function () {
                        $(this).find("img").stop(true, true).animate({ opacity: 1.0 }, 800);
                    }
                );
            }
        );
                       
    }
);

