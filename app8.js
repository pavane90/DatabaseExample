var express = require("express"); // セットアップ必要(npm install express)
var http = require("http"); // httpオブジェクト生成
var static = require("serve-static");
var path = require("path");

var bodyParser = require("body-parser");
var cookieParser = require("cookie-parser");
var expressSession = require("express-session");

//에러 핸들러
var expressErrorHandler = require("express-error-handler");

var mysql = require("mysql");

mysql.createPool({
  connectionLimit: 10,
  host: "localhost",
  user: "root",
  password: "admin",
  database: "test",
  debug: false
});

var app = express(); // express server object

app.set("port", process.env.PORT || 3000); // configure server port
app.use("/public", static(path.join(__dirname, "public"))); //폴더의 패스를 static으로 불러올 수 있다.

// post데이터 사용
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// 쿠키 컨트롤
app.use(cookieParser());
app.use(
  expressSession({
    secret: "my key",
    resave: true,
    saveUninitialized: true
  })
); // express-Session

var router = express.Router();

router.route("/process/adduser").post(function(req, res) {
  console.log("/process/adduser 라우팅 함수 호출됨");

  var paramId = req.body.id || req.query.id;
  var paramPassword = req.body.password || req.query.password;
  var paramName = req.body.name || req.query.name;
  var paramAge = req.body.age || req.query.age;

  console.log(
    "요청 파라미터 : " +
      paramId +
      ", " +
      paramPassword +
      ", " +
      paramName +
      ", " +
      paramAge
  );

  addUser(paramId, paramName, paramAge, paramPassword, function(
    err,
    addedUser
  ) {
    if (err) {
      console.log("에러가 발생했습니다" + err);
      res.writeHead(200, { "Content-Type": "text/html;charset=utf8" });
      res.write("<h1>에러 발송</h1>");
      res.end();
      return;
    }
    if (addedUser) {
      console.dir(addedUser);
      res.writeHead(200, { "Content-Type": "text/html;charset=utf8" });
      res.write("<h1>계정 추가 성공!</h1>");
      res.end();
    } else {
      console.log("사용자 추가실패" + err);
      res.writeHead(200, { "Content-Type": "text/html;charset=utf8" });
      res.write("<h1>사용자 추가실패</h1>");
      res.end();
    }
  });
});

router.route("/process/login").post(function(req, res) {
  console.log("/process/login 라우팅 함수 호출됨.");

  var paramId = req.body.id || req.query.id;
  var paramPassword = req.body.password || req.query.password;
  console.log("요청 파라미터 : " + paramId + ", " + paramPassword);

  if (database) {
    authUser(database, paramId, paramPassword, function(err, rows) {
      if (err) {
        console.log("에러가 발생했습니다" + err);
        res.writeHead(200, { "Content-Type": "text/html;charset=utf8" });
        res.write("<h1>에러 발송</h1>");
        res.end();
        return;
      }
      if (rows) {
        console.dir(rows);
        res.writeHead(200, { "Content-Type": "text/html;charset=utf8" });
        res.write("<h1>로그인 성공!</h1>");
        res.write("<div><p>사용자 : " + rows[0].name + "</p></div>");
        res.end();
        res.write('<br><br><a href="/public/login.html">다시 로그인하기</a>');
      } else {
        console.log("대상 데이터가 없음" + err);
        res.writeHead(200, { "Content-Type": "text/html;charset=utf8" });
        res.write("<h1>존재하지 않는 사용자입니다.</h1>");
        res.end();
      }
    });
  } else {
    console.log("데이터베이스 연결에러" + err);
    res.writeHead(200, { "Content-Type": "text/html;charset=utf8" });
    res.write("<h1>데이터베이스 연결에러</h1>");
    res.end();
  }
});

app.use("/", router);

var addUser = function(id, name, age, password, callback) {
  console.log("addUser 호출됨");

  pool.getConnection(function(err, conn) {
    if (err) {
      if (conn) {
        conn.release(); //풀로 커넥션 반납함
      }
      callback(err, null);
      return;
    }
    console.log("데이터베이스 연결 스레드 아이디 : " + conn.thradId);
    var data = { id: id, name: name, age: age, password: password };
    var exec = conn.query("insert into users set ?", data, function(
      err,
      result
    ) {
      conn.release();
      console.log("실행된 Sql : " + exec.sql);

      if (err) {
        console.log("sql실행시 오류발생");
        callback(err, null);
        return;
      }

      callback(null, result);
    });
  });
};

var authUser = function(db, id, password, callback) {
  console.log("authuser 호출됨" + id + ", " + password);

  pool.getConnection(function(err, conn) {
    if (err) {
      if (conn) {
        conn.release();
      }

      callback(err, null);
      return;
    }
    console.log("데이터베이스 연결 스레드 아이디 : " + conn.threadId);

    var tablename = "users";
    var columns = ["id", "name", "age"];
    var exec = conn.query(
      "select ?? from ?? where id = ? and password = ?",
      [columns, tablename, id, password],
      function(err, rows) {
        conn.release();
        console.log("실행된 SQL : " + exec.sql);

        if (err) {
          callback(err, null);
          return;
        }

        if (rows.length > 0) {
          console.log("사용자 찾음.");
          callback(null, rows);
        } else {
          console.log("사용자 찾지 못함.");
          callback(null, null);
        }
      }
    );
  });
};

var errorHandler = expressErrorHandler({
  ststic: {
    "404": "./public/404.html"
  }
});
//app.use('/public', static(path.join(__dirname, 'public'))); 처럼 public폴더도 경로에 포함시킬 수 있다.

var server = http.createServer(app).listen(app.get("port"), function() {
  console.log("express web server started : " + app.get("port"));
}); //익스프레스를 이용해서 웹서버를 작성
