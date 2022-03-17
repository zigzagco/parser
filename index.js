
const cyrillicToTranslit = require('cyrillic-to-translit-js')
const puppeteer = require('puppeteer');
const fs = require('fs');
const Axios = require('axios')
const sharp = require('sharp');
const mongoose = require('mongoose');
const Post = require('./models/Post');
const iPhone = puppeteer.devices['iPhone 6'];


const start= new Date().getTime();
(async () => {
    const browser = await puppeteer.launch({
        headless: true,
        //slowMo: 250,
    });
    const page = await browser.newPage();
    await page.emulate(iPhone);
    await page.goto('https://ria.ru/politics/',{ waitUntil: 'networkidle2' });
    const Href = await page.evaluate(() => Array.from(document.querySelectorAll('#content > div > div.layout-rubric__main > div > div.list.list-tags > div > div.list-item__content > a.list-item__title.color-font-hover-only')).map(res =>
        res.href.trim()))
    for(let url of Href) {
        const s1 = 'https://ria.ru/';
        const s2 = url.slice(0, 15);
        if (s1.toLowerCase() === s2.toLowerCase()){
            await botRun(url)
        }
    }
//-----------------------function start---------------------------------------
    async function botRun(url) {
        try {
            console.log(url)
            const page = await browser.newPage();
            await page.goto(url + '', {waitUntil: 'domcontentloaded'});
            await page.waitForSelector('[class="article__title"]');
            const pageTitle = await page.evaluate(() =>
                document.querySelector('[class="article__title"]').innerText
            )
            //console.log(pageTitle)
            await page.waitForSelector('[class="article__text"]');
            const pageText = await page.evaluate(() =>
                Array.from(document.querySelectorAll('[class="article__text"]')).map(res => res.innerText)
            )
            let rawTextStr = pageText.join()
            //console.log(rawTextStr)
            await page.waitForSelector('[class="article__tags-item"]');
            const pageTag = await page.evaluate(() =>
                Array.from(document.querySelectorAll('[class="article__tags-item"]')).map(res => res.innerText)
            )
            let rawTagStr = pageTag.join(',')
            //console.log(rawTagStr)
            const pageImg = await page.evaluate(() =>
                document.querySelector('#endless > div > div > div > div.layout-article__over > div.layout-article__main > div > div:nth-child(1) > div.article__header > div.article__announce > div > div.media__size > div > img').src
            )
            //console.log(pageImg)
            const today = new Date();
            const d = today.getUTCDate();
            const m = today.getUTCMonth();
            const y = today.getFullYear();
            let r = d+'_'+m+'_'+y+'_'+cyrillicToTranslit().transform(pageTitle,'_').toLowerCase();
            downloadImage(pageImg, '/Users/gleb/Desktop/image/'+r+'.jpg')
                .then(console.log)
                .catch(console.error);
            //console.log("file create")

            upsertPost({
                title: pageTitle,
                text: rawTextStr,
                imgUri: '/static/img/'+r+'.jpg',
                keywords: rawTagStr
            });

        }catch (error) {
            console.log(error)
        }
    }
    const end = new Date().getTime();



 //--------------------------------------SCRIPT END----------------------------------------

    async function downloadImage(url, filepath) {
        const response = await Axios({
            url,
            method: 'GET',
            responseType: 'stream'
        });
        return new Promise((resolve, reject) => {
            response.data.pipe(fs.createWriteStream(filepath))
                .on('error', reject)
                .once('close', () => resolve(filepath));
        });
    }
    function upsertPost(postObj) {
        const DB_URL = 'mongodb://127.0.0.1:27017/?directConnection=true&serverSelectionTimeoutMS=2000';
        //const DB_URL = 'mongodb://192.168.5.125:27017/?directConnection=true&serverSelectionTimeoutMS=2000';
        if (mongoose.connection.readyState === 0) {
            mongoose.connect(DB_URL);
        }

        // if this title exists, update the entry, don't insert
        // Если  title, обновить экземпляр без добавления
        const conditions = {
            title: postObj.title
        };
        const options = {
            upsert: true,
            new: true,
            setDefaultsOnInsert: true
        };

        Post.findOneAndUpdate(conditions, postObj, options, (err, result) => {
            if (err) {
                throw err;
            }
        });
    }

    console.log('Time to execute:' + (end - start)/1000 +'sec');
    await browser.close();



})();
