<?php
require_once __DIR__ . '/../lib/bootstrap.php';
bt_session_start();
$_SESSION = [];
session_destroy();
header('Location: ' . APP_URL . '/login.php');
