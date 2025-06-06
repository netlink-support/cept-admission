function toSubString(val)
{
    return val.substring(0,150);
}

function ImgError(source)
{
    source.src = "/images/no-image.jpg";
    source.onerror = "";
    return true;
}

function sorting(field)
{
    if(field in sortarray) {
        if(sortarray[field] == "desc") {
            sortarray[field]  = "asc";
            //$('#'+text).html('<img id="img_sort_name" src="images/datatables/sort_asc.png" />');
        }
        else
        {
            sortarray[field]  = "desc";
            //$('#'+text).html('<img id="img_sort_name" src="images/datatables/sort_desc.png" />');
        }
        sortfield = field;
        
    }
    else
    {
        sortarray[field]  = "asc";
        sortfield = field;
    }
    
}

function isValidEmail(email)
{
    var invalid = " ";
    if(email=='') {
        return ("Please insert e-mail.");
    }
    if(email.indexOf(invalid) > -1) {
        return ("Email should not contain space.");
    }
    else if (!(/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(email))) {
        return ("Please insert a valid e-mail.");            
    }
    return 1;
}
function getdate(val)
{
    if(val=='' || val==null) {return '';}
    //alert(val);
    val=val.replace("-","/");
    val=val.replace("-","/");
    var date1 = new Date(val);    
    return date1.format("mmm dd, yyyy");
}
        
function gettime(val)
{
    if(val=='' || val==null) {return '';}
    var time1 = new Date("25 Dec, 1995 " + val);
    return time1.format("hh:MM TT");
}

function getdatetime(val)
{
    if(val=='' || val==null) {return '';}
    var fulltime=val.split(" ");
    var newtime="";
    if(fulltime[0]) {
        fulltime[0]=fulltime[0].replace("-","/");
        fulltime[0]=fulltime[0].replace("-","/");
        var time1 = new Date(fulltime[0]);
        newtime+=time1.format("mmm dd, yyyy");
    }    
    if(fulltime[1]) {
        var time1 = new Date("25 Dec, 1995 " + fulltime[1]);
        newtime+=" "+time1.format("hh:MM TT");
    }    
    return newtime;    
}

function urlfriendlylink(val)
{
    var newval = val.trim();
     
    newval = newval.toLowerCase();
    
    newval = newval.replace(/[^a-zA-Z ]/g, "");
    
    newval = newval.replace(/\s+/g, '-');
    
    return newval;    
}
