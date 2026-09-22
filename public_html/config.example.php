<?php

return [
    'app_name' => 'استادا | مدیریت کنکور ارشد زیست/بیوتکنولوژی',
    'exam_date' => '2027-05-07',
    'timezone' => 'Asia/Tehran',

    'db' => [
        'host' => 'localhost',
        'name' => 'YOUR_DATABASE_NAME',
        'user' => 'YOUR_DATABASE_USER',
        'pass' => 'YOUR_DATABASE_PASSWORD',
        'charset' => 'utf8mb4',
    ],

    'admin' => [
        'email' => 'admin@s.alirezapourmohammadi.ir',
        'password_salt' => 'CHANGE_THIS_RANDOM_SALT',
        'password_hash' => 'CHANGE_THIS_PASSWORD_HASH',
        'password_iterations' => 120000,
    ],

    'openai' => [
        'api_key' => '',
        'model' => 'gpt-5-mini',
    ],
];
