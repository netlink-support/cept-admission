// JavaScript Document

$(
    function ($) { 
        $("input[class*='hasdatepicker']").datepicker(
            {
                changeMonth: true,
                changeYear: true,
                yearRange:"2000:2022",
                dateFormat: 'yy-mm-dd',
                showOn: "both",
                buttonImage: "images/calendar.png",
                buttonImageOnly: true
            }
        );    
    
        $('.hasdatetimepicker').datepicker(
            {
                changeMonth: true,
                changeYear: true,
                yearRange:"2000:2022",
                dateFormat: 'yy-mm-dd',
                showOn: "both",
                buttonImage: "images/calendar.png",
                buttonImageOnly: true,
                duration: '',
                showTime: true,
                time24h : true,
                constrainInput: false
            }
        );
    
    
    }
);

function numberonly(evt)
{
    var charCode = (evt.which) ? evt.which : window.event.keyCode; 
    //alert(charCode);
    if(charCode > 47 && charCode < 58 || charCode == 8 ) {
            
    }
    else
    {
        return false;    
    }
}

function fun_AllowOnlyAmountAndDot(evt,txt)
{
    var charCode = (evt.which) ? evt.which : window.event.keyCode; 
            
    if((charCode > 47 && charCode < 58) || charCode == 46 ||  charCode == 8 ) {
        var txtbx=document.getElementById(txt);
        //alert(txtbx);
        var amount = document.getElementById(txt).value;
        //  alert(amount);
        var present=0;
        var count=0;
            
        if(amount.indexOf(".",present)||amount.indexOf(".",present+1)) {}
        {

        }
        do
        {
            present=amount.indexOf(".",present);
            if(present!=-1) {
                count++;
                present++;
            }
        } while(present!=-1);
              
        if(present==-1 && amount.length==0 && charCode.keyCode == 46) {
            charCode.keyCode=0;
            //alert("Wrong position of decimal point not  allowed !!");
            return false;
        }
            
        if(count>=1 && charCode == 46) {
            charCode=0;
            //alert("Only one decimal point is allowed !!");
            return false;
        }
        if(count==1) {
            var lastdigits=amount.substring(amount.indexOf(".")+1,amount.length);
            if(lastdigits.length>=2 && charCode!=8) {
                  //alert("Two decimal places only allowed");
                  charCode=0;
                  return false;
            }
        }  return true;
    }
    else
    {
        charCode=0;
        //alert("Only Numbers with dot allowed !!");
        return false;
    }
}



