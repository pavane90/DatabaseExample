var express = require("express"); // セットアップ必要(npm install express)
var http = require("http"); // httpオブジェクト生成
var static = require("serve-static");
var path = require("path");

var bodyParser = require("body-parser");
var cookieParser = require("cookie-parser");
var expressSession = require("express-session");

//에러 핸들러
var expressErrorHandler = require("express-error-handler");

//mongodb 사용
var MongoClient = require("mongodb").MongoClient;
var database;

function connectDB() {
  var databaseUrl = "mongodb://localhost:27017/local";

  MongoClient.connect(databaseUrl, function(err, db) {
    if (err) {
      console.log("db접속에 실패했습니다.");
      return; // 종료
    }

    console.log("데이터베이스에 연결됨" + databaseUrl);
    database = db;
  });
}

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

router.route("/process/login").post(function(req, res) {
  console.log("/process/login 라우팅 함수 호출됨.");

  var paramId = req.body.id || req.query.id;
  var paramPassword = req.body.password || req.query.password;
  console.log("요청 파라미터 : " + paramId + ", " + paramPassword);

  if (database) {
    authUser(database, paramId, paramPassword, function(err, docs) {
      if (err) {
        console.log("에러가 발생했습니다" + err);
        res.writeHead(200, { "Content-Type": "text/html;charset=utf8" });
        res.write("<h1>에러 발송</h1>");
        res.end();
        return;
      }
      if (docs) {
        console.dir(docs);
        res.writeHead(200, { "Content-Type": "text/html;charset=utf8" });
        res.write("<h1>로그인 성공!</h1>");
        res.write("<div><p>사용자 : " + docs[0].name + "</p></div>");
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

var authUser = function(db, id, password, callback) {
  console.log("authuser 호출됨" + id + ", " + password);

  var users = db.collection("users");

  users.find({ id: id, password: password }).toArray(function(err, docs) {
    if (err) {
      callback(err, null);
      return;
    }

    if (docs.length > 0) {
      console.log("일치하는 사용자를 찾음");
      callback(null, docs);
    } else {
      console.log("일치하는 사용자를 찾지못함");
      callback(null, null);
    }
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
  connectDB();
}); //익스프레스를 이용해서 웹서버를 작성
