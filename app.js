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

/*---------------前処理---------------*/

/*---------------ログイン処理---------------*/

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
          req.session.studentId = studentId; //セッションの追加
          req.session.studentName = results[0].name;
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

/*---------------ログイン処理---------------*/

/*---------------DB処理---------------*/

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
    if(req.body.className == 0){
      res.redirect('/index');
    }
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
    //データベース削除処理（学生削除は他のテーブルも削除する）
    connection.query(
      'DELETE FROM teststudent WHERE id = ?',
      [req.body.studentId],
      (error, results) => {
        connection.query(
          'DELETE FROM testclass WHERE student_id = ?',
          [req.body.studentId],
          (error, results) => {
            connection.query(
              'DELETE FROM testtask WHERE student_id = ?',
              [req.body.studentId],
              (error, results) => {
                //student.indexへリダイレクト
                res.redirect('/student');
              }
            );
          }
        );
      }
    );
  }else if (req.params.about == "class") {
    //データベース削除処理
    connection.query(
      'DELETE FROM testclass WHERE id = ?',
      [req.body.classId],
      (error, results) => {
        //indexへリダイレクト
        res.redirect('/class');
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

//更新処理
app.post('/update/:about', isAuthenticated, (req, res) => {
  //分岐
  if(req.params.about == "student"){
    //データベース更新処理
    connection.query(
      'UPDATE teststudent SET name = ?, update_at = NOW() WHERE id = ?',
      [req.body.studentName, req.body.studentId],
      (error, results) => {
        //student.indexへリダイレクト
        res.redirect('/student');
      }
    );
  }else if (req.params.about == "task") {
    var date_str = req.body.taskDay;
    var taskDeadLine = date_str + " " + req.body.taskHour + "*" + req.body.taskMinute + "*00";
    //データベース更新処理
    connection.query(
      'UPDATE testtask SET class_id = ?, contents = ?, deadline = ?, submitway = ?, update_at = NOW() WHERE id = ?',
      [req.body.classId, req.body.taskContents, taskDeadLine, req.body.taskSubmitWay, req.body.taskId],
      (error, results) => {
        //indexへリダイレクト
        res.redirect('/index');
      }
    );
  }else if (req.params.about == "password") {
    //パスワードをハッシュ化する
    var pass = req.body.studentPassword;
    var sha512 = crypto.createHash('sha512');
    sha512.update(pass);
    var hash = sha512.digest('hex');
    //データベース更新処理
    connection.query(
      'UPDATE teststudent SET password = ? WHERE id = ?',
      [hash, req.session.studentId],
      (error, results) => {
        //indexへリダイレクト
        res.redirect('/index');
      }
    );
  }
});

/*---------------DB処理---------------*/

/*---------------学生管理---------------*/
//一覧表示
app.get('/student', isAuthenticated, (req, res) => {
  connection.query(
    'SELECT * FROM teststudent ORDER BY id',
    (error, results) => {
      res.render('students/index.ejs', {students: results});
    }
  );
});

/*---------------学生管理---------------*/

/*---------------授業管理---------------*/

//一覧表示
app.get('/class', isAuthenticated, (req, res) => {
  connection.query(
    'SELECT * FROM testclass WHERE student_id = ? ORDER BY id',
    [req.session.studentId],
    (error, results) => {
      res.render('classes/index.ejs', {classes: results});
    }
  );
});

/*---------------授業管理---------------*/



/*---------------課題管理---------------*/


/*---------------課題管理---------------*/



/*---------------共通ページ---------------*/
//初期画面
app.get('/index', isAuthenticated, (req, res) => {
  var name = req.session.studentName;
  connection.query(
    'SELECT task.id, task.contents, DATE_FORMAT(task.deadline, "%Y年%m月%d日%H:%i:%s") as deadline, task.submitway, DATE_FORMAT(task.created_at, "%Y/%m/%d") as created, class.name as className FROM testtask as task LEFT JOIN testclass as class ON class.id = task.class_id LEFT JOIN teststudent as student ON student.id = task.student_id WHERE student.id = ? ORDER BY deadline',
    [req.session.studentId],
    (error, results) => {
      res.render('index.ejs', {tasks: results, studentName: name});
    }
  );
});
//新規作成画面
app.get('/new/:about', isAuthenticated, (req, res) => {
  if(req.params.about == "student"){
    res.render('students/new.ejs');
  } else if(req.params.about == "class"){
    connection.query(
      'SELECT id, name FROM testclass WHERE student_id = ?',
      [req.session.studentId],
      (error, results) => {
        res.render('classes/new.ejs', {classes: results});
      }
    );
  } else if(req.params.about == "task"){
    connection.query(
      'SELECT id, name FROM testclass WHERE student_id = ?',
      [req.session.studentId],
      (error, results) => {
        res.render('tasks/new.ejs', {classes: results});
      }
    );
  }
});
//編集画面
app.post('/edit/:about', isAuthenticated, (req, res) => {
  if(req.params.about == "student"){
    connection.query(
      'SELECT * FROM teststudent WHERE id = ?',
      [req.body.studentId],
      (error, results) => {
        res.render('students/edit.ejs', {student: results});
      }
    );
  } else if(req.params.about == "task"){
    connection.query(
      'SELECT task.id, task.class_id,  task.contents, DATE_FORMAT(task.deadline, "%Y-%m-%d") as deadlineDay, HOUR(task.deadline) AS deadlineHour, MINUTE(task.deadline) AS deadlineMinute, task.submitway, class.name FROM testtask AS task LEFT JOIN testclass AS class ON task.id = ? WHERE task.id = ?',
      [req.body.taskId],
      (error, results) => {
        res.render('tasks/edit.ejs', {task: results});
      }
    );
  }
});
/*---------------共通ページ---------------*/

app.listen(3000);