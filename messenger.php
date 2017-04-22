<?php
    
    echo "One";
    function my_function($oaid, $sender, $text, $timestamp, $secretkey){

    	//echo $sender;

    	$arr = array('uid'=>(int)$sender,'message'=>$text);

    	$data = json_encode($arr);
    	//echo $data;

    	$passcode = (int)$oaid.$data.$timestamp.$secretkey;

    	//echo $passcode;
        
        $result = hash('sha256', $passcode);
        return $result;
    }
?>
