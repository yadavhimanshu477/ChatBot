<?php
    
    echo "One";
    function my_function($oaid, $sender, $text, $timestamp, $secretkey){

    	echo $sender.'/n';

    	$data = {uid:(int)$sender,message:$text}

    	$passcode = $oaid+$data+$timestamp+$secretkey;

    	echo $passcode.'/n';
        
        echo hash('sha256', $passcode);
        return "kkk";
    }
?>
