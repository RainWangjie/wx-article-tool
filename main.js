window.$ = window.jQuery = require('jquery');
require('bootstrap');
const fs = require('fs');
const http = require('http');
const https = require('https');

// 获取系统主目录
const os = require('os');
const homeDir = `${os.homedir()}/Documents/df-article-resource`;
const localPathImage = `${homeDir}/images/`;
const localPathHtml = `${homeDir}/html/`;

// 本地目录创建
createFile(homeDir).then(() => {
    createFile(localPathImage)
}).then(() => {
    createFile(localPathHtml)
});

function createFile(path) {
    return new Promise(function (resolve, reject) {
        fs.exists(path, (exists) => {
            if (exists) {
                resolve();
                return;
            }
            fs.mkdir(path, function (err) {
                if (err) {
                    reject();
                    throw err;
                }
                console.log(`make dir${path} success.`);
                resolve();
            });
        })
    });
}

// 辅助函数
let utils = {
    console(text, className = '') {
        $console.append(`<li class="list-group-item ${className}">${text}</li>`)
    },
    selectDownloadType(src) {
        return src.substr(0, 5) === 'https' ? https : http
    }
};

// DOM处理
const cheerio = require('cheerio');

// oss配置
const OSS = require('ali-oss').Wrapper;
const ossConfig = require(`${__dirname}/oss-config.json`);

let client = new OSS(ossConfig);

// 添加交互区
const $model = $('#modal-add-action');

// 存储文章标题
let articleTitle = '';

// 微信文章容器
const $wx = $('.rich_media_area_primary');

// 打印窗
const $console = $('#console-wrapper ul');

/**
 *  打开微信文章
 *  ========================================================
 */
let $url = $('[name="article-url" ]');
$('.btn-open').on('click', () => {
    reset();
    let url = $url.val();
    if (!url) {
        alert('输入url');
        return;
    }

    utils.console('开始获取文章');
    getArticle(url).then((html) => {
        //采用cheerio模块解析html
        let $cheerio = cheerio.load(html, {decodeEntities: false});
        articleTitle = $cheerio('title').html();
        $wx.html($cheerio('.rich_media_area_primary').html());
        preLoadImage();
        delWxApp();
    }, () => {
        utils.console('获取文章失败！！！', 'warning')
    })
});

// 获取文章
function getArticle(url) {
    return new Promise(function (resolve, reject) {
        utils.selectDownloadType(url)
            .get(url, function (res) {
                let html = '';        //用来存储请求网页的整个html内容
                res.setEncoding('UTF-8'); //防止中文乱码
                //监听data事件，每次取一块数据
                res.on('data', function (chunk) {
                    html += chunk;
                });
                //监听end事件，如果整个网页内容的html都获取完毕，就执行回调函数
                res.on('end', function () {
                    utils.console('获取文章成功', 'success');
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
        let $el = $(this),
            src = $el.attr('data-src');
        if (src) {
            $el.attr('src', src);
        }
        // 临时方法

        let type=$el.attr('data-action-type');
        if (type) {
            $el.parent().attr('data-action-type', type);
        }
    });
}

// 解除小程序操作
function delWxApp() {
    $('.weapp_image_link img').unwrap();
}

/**
 * 抓取并替换图片
 * ========================================================
 */
$('.btn-capture-img').on('click', () => {
    // 创建文章目录，并开始下载文件
    createFile(`${localPathImage}${articleTitle}`).then(captureImg);
});

function captureImg() {
    let promiseList = [];
    let i = 1;
    $wx.find('img').each(function (index, el) {
        let src = $(el).attr('src');

        if (new RegExp('http').test(src)) {
            promiseList.push(captureImgItem(el, i));
            i++
        }
    });
    $wx.find('section').each(function (index, el) {
        let is_bg = $(el).css('background-image').replace(/url\((.+)\)/, '$1').replace(/"/g, '');
        if (is_bg !== 'none') {
            promiseList.push(captureBgItem(el, i));
            i++;
        }
    });

    Promise.all(promiseList).then(() => {
        alert('图片全部抓取完成');
        utils.console('图片全部抓取完成！！！', 'success');
    }).catch(() => {
        utils.console('异常，请重试', 'warning')
    });
}

// 抓取img标签图片
function captureImgItem(el, index) {
    return downloadImg(el, index).then(updateImg, (index) => {
        console.log(`Img图片${index}无效`, 'warning');
    }).then(changeImg).catch((err) => {
        console.log(err)
    });
}

// 抓取dom背景图片
function captureBgItem(el, index) {
    return downloadImg(el, index).then(updateImg, (index) => {
        console.log(`Bg图片${index}无效`, 'warning');
    }).then(changeBg).catch((err) => {
        console.log(err)
    });
}

// 下载图片
function downloadImg(el, index) {
    return new Promise(function (resolve, reject) {
        let src = $(el).attr('data-src'),
            name = `${new Date().getTime()}${Math.random().toString().substr(2, 6)}`,
            type = $(el).attr('data-type'),
            imgLocalPath = `${localPathImage}${articleTitle}/${name}.${type}`;

        if (!src) {
            reject(index);
            return;
        }

        utils.console(`图片${index}下载...`);
        utils.selectDownloadType(src).get(src, function (res) {
            let file = fs.createWriteStream(imgLocalPath);
            res.pipe(file);
            res.on('end', function () {
                utils.console(`图片${index}下载完成`, 'success');
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
    utils.console(`上传图片${obj.index}...`);
    return client.put(`/article/${obj.name}`, obj.path).then(function (val) {
        console.log(val.res.requestUrls[0]);
        obj.cloudPath = val.res.requestUrls[0].replace('http', 'https');
        return obj;
    });
}

//替换图片
function changeImg(obj) {
    utils.console(`Img图片${obj.index}上传成功`, 'success');
    $(obj.el).attr('src', obj.cloudPath).attr('data-src', '');
}

//替换背景
function changeBg(obj) {
    utils.console(`Bg图片${obj.index}上传成功`, 'success');
    $(obj.e).css('background-image', `url(${obj.cloudPath})`);

}

/*
 * 文章保存到本地
 * ========================================================
 */
$('.btn-save').on('click', saveFile);

function saveFile() {
    let tplHTML = $('#tpl').html();
    // 标题
    tplHTML = tplHTML.replace('{0}', articleTitle);

    //内容
    tplHTML = tplHTML.replace('{1}', $('#article-preview').html());

    // 脚本
    tplHTML = tplHTML.replace('{2}', '<script>\n' +
        '        var platform = location.search.split(\'=\')[1];\n' +
        '        document.body.onclick = (e) => {\n' +
        '            if (e.target && e.target.nodeName === \'IMG\') {\n' +
        '                var el = e.target,\n' +
        '                    value = el.getAttribute(\'data-action-value\'),\n' +
        '                    type = el.getAttribute(\'data-action-type\');\n' +
        '                if (!value || !type) {\n' +
        '                    return\n' +
        '                }\n' +
        '\n' +
        '                if (platform === \'PC\') {\n' +
        '                    var data = {\n' +
        '                        \'type\': type,\n' +
        '                        \'value\': value\n' +
        '                    };\n' +
        '                    window.parent.postMessage(data, \'*\');\n' +
        '                }\n' +
        '\n' +
        '                if (platform === \'APP\') {\n' +
        '                    if (new RegExp(\'subscribe\').test(type)) {\n' +
        '                        location.href = \'dfapp:action?type=subscribe&bloggerId=\' + value\n' +
        '                    }\n' +
        '                    if (type === \'favorite\') {\n' +
        '                        location.href = \'dfapp:action?type=favorite&blogId=\' + value\n' +
        '                    }\n' +
        '                }\n' +
        '                console.log(\'iframe\', data)\n' +
        '            }\n' +
        '        };\n' +
        '</script>');

    let file_name = `${localPathHtml}${articleTitle}.html`;
    fs.writeFile(file_name, tplHTML, 'utf8', function (err) {
        if (err) {
            alert(err);
        }
        utils.console(`${articleTitle}文章保存成功！！！`, 'success');
        alert(`${articleTitle}文章保存成功！！！`);
    });
}

/**
 * 为图片添加交互
 * ========================================================
 */
let $currentImg,
    $actionType = $('[name="action-type"]'),
    $actionValue = $('[name="action-value"]');
$wx.on('click', 'img', function () {
    $currentImg = $(this);
    let actionType = $currentImg.attr('data-action-type') || 'favorite',
        actionValue = $currentImg.attr('data-action-value') || '',
        dataSrc = $currentImg.attr('data-src') || '';

    if (dataSrc) {
        alert('请选抓取图片');
        return;
    }
    $actionType.val(actionType);
    $actionValue.val(actionValue);

    $model.modal('show')
});

// 保存交互
$('.btn-save-action').on('click', function () {
    let actionValue = $actionValue.val(),
        actionType = $actionType.val();
    if (!actionValue) {
        alert('输入框为空');
        return;
    }

    $currentImg.attr('data-action-type', actionType)
        .attr('data-action-value', actionValue);

    $currentImg.parent().attr('data-action-type', actionType);

    $model.modal('hide');
});

/**
 * 重置
 */
$('.btn-reset').on('click', function () {
    $url.val();
    reset();
});

function reset() {
    $wx.html('');
    $console.html('');
}

