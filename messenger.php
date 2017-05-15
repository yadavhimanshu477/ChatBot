<?php
    
    echo "One";
    function my_function_zalo($oaid, $data, $timestamp, $secretkey){

        //$datas = json_encode($data);
    	$passcode = (int)$oaid.$data.$timestamp.$secretkey;

    	echo $passcode;

        //$passcode = '1032900368143269705{"phone":841289456817,"templateid":"cc78f992c5d72c8975c6","templatedata":{"name":"Amrita","company":"Shezartech","number":"123","date":"01/01/2017"}}1492597209077IEklE4N1I7bWqp5TOQ2F';
        
        $result = hash('sha256', $passcode);
        return $result;
    }

    function my_function($oaid, $sender, $text, $timestamp, $secretkey){
        //echo $sender;
        $arr = array('uid'=>(int)$sender,'message'=>$text);
        //echo $arr;
        $data = json_encode($arr, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        $data = json_encode($arr);
        //echo $data;
        $passcode = (int)$oaid.$data.$timestamp.$secretkey;
        echo $passcode;
        
        $result = hash('sha256', $passcode);
        return $result;
    }

    function my_function_status($oaid, $msgid, $timestamp, $secretkey) {
        //mac = sha256 (oaid + msgid + timestamp + secretkey)
        $passcode = (int)$oaid.$msgid.$timestamp.$secretkey;
        echo $passcode;
        $result = hash('sha256', $passcode);
        return $result;
    }
?>
