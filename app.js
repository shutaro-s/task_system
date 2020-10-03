/*---------------前処理---------------*/

const express = require('express');
const mysql = require('mysql');
const bodyParser = require('body-parser');
const session = require('express-session');
const domain = require('express-domain-middleware');
const crypto = require("crypto");
const app = express();

app.use(express.static('public'));
app.use(express.urlencoded({extended: false}));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(domain);
app.use(session({
  secret: 'secret',
  resave: false,
  saveUninitialized: false,
  cookie:{
  httpOnly: true,
  secure: false,
  maxage: 1000 * 60 * 60 //セッションの消滅時間を60分に設定
  }
})); 

//毎回の認証確認用
function isAuthenticated(req, res, next){
  if (req.session.studentId) {  // 認証済
      return next();
  }
  else {  // 認証されていない
      res.redirect('/login');  // ログイン画面に遷移
  }
}

//MySQL接続処理
const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'cY8TuNsnkRvz',
  database: 'task_system'
});

//接続できたかを確認
connection.connect((err) => {
if (err) {
  console.log('error connecting: ' + err.stack);
  return;
}
  console.log('success');
});

/*---------------ここからログイン処理---------------*/

//ログイン画面&認証処理
app.get('/', (req, res) => {
  res.render('login.ejs');
});
app.get('/login', (req, res) => {
  res.render('login.ejs');
});
app.post('/login', (req, res) => {
  var studentId = req.body.studentId;
  var pass = req.body.password;
  var sha512 = crypto.createHash('sha512');
  sha512.update(pass);
  var hash = sha512.digest('hex');
  connection.query(
    'SELECT id, name FROM teststudent WHERE id = ? AND password = ?',
    [studentId, hash],
    (error, results) => {
      if(results[0] == null){
        res.redirect('/');
      }else{
        req.session.regenerate((err) => {
          req.session.studentId = studentId;
          res.redirect('/index');
        });
      }
    }
  );
});
//ログアウト
app.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    res.redirect('/');
  });
});

/*---------------ここからメイン処理---------------*/
//初期画面
app.get('/index', isAuthenticated, (req, res) => {
  var id = req.session.studentId;
  connection.query(
    'SELECT task.id, task.contents, DATE_FORMAT(task.deadline, "%Y年%m月%d日%H:%i:%s") as deadline, task.submitway, DATE_FORMAT(task.created_at, "%Y/%m/%d") as created, class.name as className, student.name as studentName FROM testtask as task LEFT JOIN testclass as class ON class.id = task.class_id LEFT JOIN teststudent as student ON student.id = task.student_id WHERE student.id = ? ORDER BY deadline',
    [id],
    (error, results) => {
      res.render('index.ejs', {tasks: results});
    }
  );
});

//新規作成画面
app.get('/new/:about', isAuthenticated, (req, res) => {
  if(req.params.about == "student"){
    res.render('students/NewStudent.ejs');
  } else if(req.params.about == "class"){
    res.render('classes/NewClass.ejs');
  } else if(req.params.about == "task"){
    connection.query(
      'SELECT id, name FROM testclass',
      (error, results) => {
        res.render('tasks/NewTask.ejs', {classes: results});
      }
    );
  }
});
//新規作成処理
app.post('/create/:about', isAuthenticated, (req, res) => {
  //分岐
  if(req.params.about == "student"){
    //パスワードをハッシュ化する
    var pass = req.body.studentPassword;
    var sha512 = crypto.createHash('sha512');
    sha512.update(pass);
    var hash = sha512.digest('hex');
  //データベース追加処理
  connection.query(
    'INSERT INTO teststudent (id, name, password) VALUES(?, ?, ?)',
    [req.body.studentId, req.body.studentName, hash],
    (error, results) => {
    //indexへリダイレクト
    res.redirect('/index');
    }
  );
  }else if (req.params.about == "class") {
    //データベース追加処理
    connection.query(
      'INSERT INTO testclass (student_id, name) VALUES(?, ?)',
      [req.session.studentId, req.body.className],
      (error, results) => {
        //indexへリダイレクト
        res.redirect('/index');
      }
    );
  }
  else if (req.params.about == "task") {
    var date_str = req.body.taskDay;
    var taskDeadLine = date_str + " " + req.body.taskHour + "*" + req.body.taskMinute + "*00";
    console.log(taskDeadLine);
    //データベース追加処理
    connection.query(
      'INSERT INTO testtask (student_id, class_id, contents, deadline, submitway) VALUES(?, ?, ?, ?, ?)',
      [req.session.studentId, req.body.classId, req.body.taskContents, taskDeadLine, req.body.taskSubmitWay],
      (error, results) => {
        //indexへリダイレクト
        res.redirect('/index');
      }
    );
  }
});

//削除処理
app.post('/delete/:about', isAuthenticated, (req, res) => {
  //分岐
  if(req.params.about == "student"){
    //データベース削除処理
    connection.query(
      'INSERT INTO teststudent (id, name, password) VALUES(?, ?, ?)',
      [req.body.studentId, req.body.studentName, req.body.studentPassword],
      (error, results) => {
        //indexへリダイレクト
        res.redirect('/index');
      }
    );
  }else if (req.params.about == "class") {
    //データベース削除処理
    connection.query(
      'INSERT INTO testclass (student_id, name) VALUES(?, ?)',
      [req.body.studentId, req.body.className],
      (error, results) => {
        //indexへリダイレクト
        res.redirect('/index');
      }
    );
  }else if (req.params.about == "task") {
    //データベース削除処理
    connection.query(
      'DELETE FROM testtask WHERE id = ?',
      [req.body.taskId],
      (error, results) => {
        //indexへリダイレクト
        res.redirect('/index');
      }
    );
  }
});

app.listen(3000);