const $ = require('jquery');
const http = require('http');
const https = require('https');

const fs = require('fs');
const cheerio = require('cheerio');

const localPath = './images/';
const OSS = require('ali-oss').Wrapper;

//oss 配置
const ossConfig = require('./oss-config.json');

let client = new OSS(ossConfig);
// 存储文章标题
let articleTitle = '';

// 微信文章容器
const $wx = $('.rich_media_area_primary');

// 打印窗
const $console = $('#console-wrapper ul');

// 辅助函数
let util = {
    console(text) {
        $console.append(`<li>${text}</li>`)
    },
    selectDownloadType(src) {
        return src.substr(0, 5) === 'https' ? https : http
    }
};

// 打开微信文章
$('.btn-open').on('click', () => {
    let url = $('[name="article-url" ]').val();
    if (!url) {
        alert('输入url');
        return;
    }

    util.console('开始获取文章');
    getArticle(url).then((html) => {
        //采用cheerio模块解析html
        let $cheerio = cheerio.load(html, {decodeEntities: false});
        articleTitle = $cheerio('title').html();
        $wx.html($cheerio('.rich_media_area_primary').html());
        preLoadImage();
    })
});

// 获取文章
function getArticle(url) {
    return new Promise(function (resolve, reject) {
        util.selectDownloadType(url)
            .get(url, function (res) {
                let html = '';        //用来存储请求网页的整个html内容
                res.setEncoding('UTF-8'); //防止中文乱码
                //监听data事件，每次取一块数据
                res.on('data', function (chunk) {
                    html += chunk;
                });
                //监听end事件，如果整个网页内容的html都获取完毕，就执行回调函数
                res.on('end', function () {
                    util.console('获取文章成功');
                    resolve(html);
                });

            })
            .on('error', function (err) {
                reject(err);
                console.log(err);
            });
    });

}

// 预加载微信图片
function preLoadImage() {
    $wx.find('img').each(function () {
        $(this).attr('src', $(this).attr('data-src'))
    })
}

// 替换图片
$('.btn-capture-img').on('click', captureImg);

function captureImg() {
    let promiseList = [];
    $wx.find('img').each(function (index, el) {
        promiseList.push(captureImgItem(el, index))
    });
    Promise.all(promiseList).then(() => {
        util.console('图片全部下载完成！！！');
    });
}

function captureImgItem(el, index) {
    return downloadImg(el, index).then(updateImg, (index) => {
        console.log(`图片${index}无效`);
    }).then(changeImg).catch((err) => {
        console.log(err)
    });
}

// 下载图片
function downloadImg(el, index) {
    return new Promise(function (resolve, reject) {
        let src = $(el).attr('data-src'),
            name = `${new Date().getTime()}${Math.random().toString().substr(2, 6)}`,
            type = $(el).attr('data-type'),
            imgLocalPath = `${localPath}${name}.${type}`;

        if (!src) {
            reject(index);
            return;
        }

        util.console(`图片${index}下载..`);
        util.selectDownloadType(src).get(src, function (res) {
            let file = fs.createWriteStream(imgLocalPath);
            res.pipe(file);
            res.on('end', function () {
                util.console(`图片${index}下载完成`);
                resolve({
                    el,
                    index,
                    path: imgLocalPath,
                    name
                });
            })
        });
    })
}

// 上传图片
function updateImg(obj) {
    console.log(obj.path);
    util.console(`上传图片${obj.index}...`);
    return client.put(`/article/${obj.name}`, obj.path).then(function (val) {
        console.log(val.res.requestUrls[0]);
        obj.cloudPath = val.res.requestUrls[0];
        return obj;
    });
}

//替换图片
function changeImg(obj) {
    util.console(`图片${obj.index}上传成功`);
    $(obj.el).attr('src', obj.cloudPath).attr('data-src', '');
}

// 文章保存到本地
$('.btn-save').on('click', saveFile);

function saveFile() {
    let tplHTML = $('#tpl').html();
    // 标题
    tplHTML = tplHTML.replace('{0}', articleTitle);

    //内容
    tplHTML = tplHTML.replace('{1}', $('#article-preview').html());

    let file_name = `./html/${articleTitle}.html`;
    fs.writeFile(file_name, tplHTML, 'utf8', function (err) {
        if (err) {
            alert(err);
        }
        util.console(`${articleTitle}文章保存成功！！！`);
        alert(`${articleTitle}文章保存成功！！！`);
    });
}

