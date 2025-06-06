
$(window).load(
    function () {

        /*  1. Page scroll
        ==========================================*/
        $('ul#menu li a').click(
            function () {
                  var id = $(this).attr("href");
                  $('html,body').animate({scrollTop: $("div"+id).offset().top},'slow');

                return false;
            }
        );

        /*  2. Mobile menu
        ==========================================*/
        $('a#mobile_nav').click(
            function () {
     
                  $(this).toggleClass('hide_menu')
                  $('ul#menu').toggleClass('show');

                return false;
            }
        );

        $('a.hide').click(
            function () {

                $('ul#menu').slideUp(
                    "normal", function () {
                        $(this).removeAttr("style"); }
                );

                return false;
            }
        );


        /*  3. Flexslider for the home
        ==========================================*/
        $('#slider').flexslider(
            {
                animation: "slide",              //String: Select your animation type, "fade" or "slide"
                slideDirection: "horizontal",   //String: Select the sliding direction, "horizontal" or "vertical"
                slideshow: true,                //Boolean: Animate slider automatically
                // slideshowSpeed: 7000,           //Integer: Set the speed of the slideshow cycling, in milliseconds
                slideshowSpeed: 7000,
                animationDuration: 600,         //Integer: Set the speed of animations, in milliseconds
                directionNav: true,             //Boolean: Create navigation for previous/next navigation? (true/false)
                controlNav: false,               //Boolean: Create navigation for paging control of each clide? Note: Leave true for manualControls usage
                keyboardNav: true,              //Boolean: Allow slider navigating via keyboard left/right keys
                mousewheel: false,              //Boolean: Allow slider navigating via mousewheel
                prevText: "",                   //String: Set the text for the "previous" directionNav item
                nextText: "",                   //String: Set the text for the "next" directionNav item
                pausePlay: false,               //Boolean: Create pause/play dynamic element
                pauseText: 'Pause',             //String: Set the text for the "pause" pausePlay item
                playText: 'Play',               //String: Set the text for the "play" pausePlay item
                randomize: false,               //Boolean: Randomize slide order
                slideToStart: 0,                //Integer: The slide that the slider should start on. Array notation(0 = first slide)
                animationLoop: true,            //Boolean: Should the animation loop? If false, directionNav will received "disable" classes at either end
                pauseOnAction: true,            //Boolean: Pause the slideshow when interacting with control elements, highly recommended.
                pauseOnHover: true,            //Boolean: Pause the slideshow when hovering over slider, then resume when no longer hovering
                manualControls: "",             //Selector: Declare custom control navigation. Example would be ".flex-control-nav li" or "#tabs-nav li img", etc. The number of elements in your controlNav should match the number of slides/tabs.
                start: function (e) {
                    if($("#slider span[data-src]").size()>0    ) {  
                        e.pause();
                        e.manualPause = true;
                        //$(".flex-direction-nav").hide();
                        $(".flex-html-caption").show();
                        window.setTimeout(
                            function () {
                                $("#slider span[data-src]").each(
                                    function (i,obj) {
                                        var temp='<img onloadstart=" $(\'#banner_loader_'+ $(obj).attr('data-id') +'\').remove()"  onload=" $(\'#banner_loader_'+ $(obj).attr('data-id') +'\').remove()" src="'+ $(obj).attr('data-src') +'" />';
                                        $(obj).replaceWith(temp); 
                                        //  $(obj).parent('li').addClass('init');
                                        }
                                );
                                $('#slider').waitForImages(
                                    function () { 
                                        //alert('loaded'); 
                                        e.resume();
                                        e.manualPause = false;    
                                        $(".flex-html-caption").show();
                                        //$(".flex-direction-nav").show();
                                        //$(".banner-loading-ud").remove();
                                        }
                                );    
                                },200
                        );
                    }
                },//Callback: function (slider) - Fires when the slider loads the first slide
                before: function (e) {
                },           //Callback: function (slider) - Fires asynchronously with each slider animation
                after: function (e) {
                },            //Callback: function (slider) - Fires after each slider animation completes
                end: function (){}
            }
        );
     
        /*  4. Flexslider for portfolio item
        ==========================================*/
        $('.slideshow').flexslider({controlNav: false});
     
        /*  5. Portfolio zoom effect
        ==========================================*/
        $('ul.sortablePortfolio li').hover(
            function () {
                $(this).find('a').stop().animate({opacity:0.2},600);
                return false;
            },
            function () {
                $(this).find('a').stop().animate({opacity: 1},600);
                return false;
            }
        );

        /*  6. Load and show portfolio item
        ==========================================*/
        $('ul.sortablePortfolio li a').click(
            function () {
                 var source = $(this).attr("href");
                $("div#filter_wrapper").slideUp(
                    300, function () {
                        $('div.item_container').load(
                            source, function () { 
                                    $('div.item').slideDown(
                                        500,function () {
                                              $('.slideshow').flexslider({controlNav: false});
                                            $('div.item a.close').click(
                                                function () {
                                                    $(this).parent('div.item').slideUp(
                                                        300, function () {
                                                             $('div.item_container').empty();
                                                             $("div#filter_wrapper").slideDown(300);
                                                        }
                                                    );
                                                    return false;
                                                }
                                            );
                                        }
                                    );

                            }
                        );
                    }
                );
                return false;
            }
        );

        /*  7. Filtering portfolio elements
        ==========================================*/
        var $filterType = $('#filterOptions li.active a').attr('class');
        var $holder = $('ul.sortablePortfolio');
        var $data = $holder.clone();

        $('#portfolioFilter li a').click(
            function (e) {

                  $('#portfolioFilter li').removeClass('active');
                  var $filterType = $(this).attr('class');
                  $(this).parent().addClass('active');

                if ($filterType == 'all') {
                        var $filteredData = $data.find('li');
                } else {
                     var $filteredData = $data.find('li[data-type=' + $filterType + ']');
                }

                $holder.quicksand(
                    $filteredData, {
                        duration: 800,
                        easing: 'easeInSine'
                    }, function () {
                            $('ul.sortablePortfolio li').hover(
                                function () {
                                    $(this).find('a').stop().animate({opacity:0.2},600); return false; },
                                function () {
                                    $(this).find('a').stop().animate({opacity: 1},600); return false; }
                            );
                              
                            $('ul.sortablePortfolio li a').click(
                                function () {
                                    var source = $(this).attr("href");
                                    $("div#filter_wrapper").slideUp(
                                        300, function () {
                                            $('div.item_container').load(
                                                source, function () {
                                                        $('div.item').slideDown(
                                                            500,function () {
                                                                  $('.slideshow').flexslider({controlNav: false});
                                                                $('div.item a.close').click(
                                                                    function () {
                                                                        $(this).parent('div.item').slideUp(
                                                                            300, function () {
                                                                                  $('div.item_container').empty();
                                                                                  $("div#filter_wrapper").slideDown(300);
                                                                            }
                                                                        );
                                                                        return false;
                                                                    }
                                                                );
                                                            }
                                                        );
                                                }
                                            );
                                        }
                                    );
                                    return false;
                                }
                            );
                    }
                );
                  return false;
            }
        );

        /*  8. Animate social icons
        ==========================================*/
        $('#contact_info ul.social_icons li').hover(
            function () {
                $(this).find('img').stop().animate({marginTop: "-7px"},600);
                return false;
            },
            function () {
                $(this).find('img').stop().animate({marginTop: "0px"},600);
                return false;
            }
        );

    }
);

$(document).ready(
    function () {
  
        /*  9. Validate contact form
        ==========================================*/
        var name_value   = 'YOUR NAME *'; //default placeholder text for the name field
        var mail_value   = 'YOUR EMAIL ADDRESS *'; //default placeholder text for the email field
        var message_value= 'YOUR MESSAGE *'; //default place holder text for the textarea

        var missing_name = 'Please fill in your name!'; //error message, if the name field is empty
        var missing_mail = 'Please fill in your email!'; //error message, if the mail field is empty
        var invalid_mail = 'OPlease fill in correct email!'; //error message, if the user's email address is invalid
        var missing_message = 'Your message here!'; //error message, if the textarea is empty

        var error_color   = '#990000'; //text color of the error messages
        var default_color = '#666666'; //default text color of the contact form

        $('input#form-name').click(
            function () {

                  var form_name = $('input#form-name').val();

                if (form_name == missing_name) {
                     $('input#form-name').css("color" , default_color);
                     $('input#form-name').val('');
                }
                else if (form_name == name_value) {
                      $('input#form-name').val('');
                      $('input#form-name').css("color" , default_color);
                }

            }
        );

        $('input#form-mail').click(
            function () {

                  var form_mail = $('input#form-mail').val();

                if (form_mail == missing_mail || form_mail == invalid_mail) {
                    $('input#form-mail').css("color" , default_color);
                    $('input#form-mail').val('');
                }
                else if (form_mail == mail_value) {
                      $('input#form-mail').val('');
                      $('input#form-mail').css("color" , default_color);
                }

            }
        );

        $('textarea#form-message').click(
            function () {

                  var message_content = $('textarea#form-message').val();

                if (message_content == missing_message || message_content == message_value) {
                     $('textarea#form-message').css("color" , default_color);
                     $('textarea#form-message').val('');
                }
            }
        );

        $('#button_wrapper input#button').click(
            function () {

                  var name = $('input#form-name').val();
                  var email = $('input#form-mail').val();
                  var telephone = $('input#form-telephone').val();
                  var comments = $('textarea#form-message').val();

                if (name == "" || name == missing_name || name == name_value) {
                     $('input#form-name').css("color" , error_color);
                     $('input#form-name').val(missing_name);
                     return false;
                }

                if (email == "" || email == invalid_mail || email == mail_value) {
                    $('input#form-mail').css("color" , error_color);
                    $('input#form-mail').val(missing_mail);
                    return false;
                }
               
                var atpos=email.indexOf("@");
                var dotpos=email.lastIndexOf(".");
                if (atpos<1 || dotpos<atpos+2 || dotpos+2>=email.length) {
                    $('input#form-mail').css("color" , error_color);
                    $('input#form-mail').val(invalid_mail);
                    return false;
                }

                if (comments == "" || comments == message_value || comments == missing_message) {
                    $('textarea#form-message').css("color" , error_color);
                    $('textarea#form-message').val(missing_message);
                    return false;
                }

                $('div#input_wrapper').remove();
                $('div#textarea_wrapper').remove();
                $('div#button_wrapper').remove();
                $('div#result').append('<div id="loading"></div>');

                $.ajax(
                    {
                    type: 'post',
                    url: 'mail.php',
                    data: 'name=' + name + '&email=' + email + '&comments=' + comments,

                    success: function (results) {
                          $('div#loading').remove();
                          $('div#result').html(results);
                        $(".success a").click(
                            function () {
                                $("div.success").fadeOut("slow"); return false; }
                        );
                        $(".error a").click(
                            function () {
                                $("div.error").fadeOut("slow"); return false; }
                        );
                    }
                    }
                );

            }
        );//send click process ends here
        

        /*  10. Tool tip settings
        ==========================================*/
        /*var fb_text = "Like this site!";
        var rss_text = "Subscribe to my rss feeds!";
        var twitter_text = "Follow me on twitter!";
        var skype_text = "Call me on skype!";
        var dribble_text = "View my dribble profile!";
        var linked_in_text = "LinkedIn!"
        var vimeo_text = "View my Vimeo channel!";
        var youtube_text = "View my Youtube channel!";

        $("#fb").tipTip({ delay: 100, content: fb_text });
        $("#rss").tipTip({ delay: 100, content: rss_text });
        $("#twitter").tipTip({ delay: 100, content: twitter_text });
        $("#skype").tipTip({ delay: 100, content: skype_text });
        $("#dribble").tipTip({ delay: 100, content: dribble_text });
        $("#linked").tipTip({ delay: 100, content: linked_in_text });
        $("#vimeo").tipTip({ delay: 100, content: vimeo_text });
        $("#youtube").tipTip({ delay: 100, content: youtube_text });*/

    }
);