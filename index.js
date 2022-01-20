const puppeteer = require('puppeteer');
const fs = require('fs');
const Axios = require('axios')
const sharp = require('sharp');
const mongoose = require('mongoose');
const User = require('./models/Post');
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
    //const Title = await page.evaluate(() => Array.from(document.querySelectorAll('#content > div > div.layout-rubric__main > div > div.list.list-tags > div > div.list-item__content > a')).map(res =>
    //res.innerText.trim()))
    const Href = await page.evaluate(() => Array.from(document.querySelectorAll('#content > div > div.layout-rubric__main > div > div.list.list-tags > div > div.list-item__content > a.list-item__title.color-font-hover-only')).map(res =>
        res.href.trim()))
    console.log(Href)
    console.log(Href.length)

    for(let url of Href) {
        console.log(url)
        await botRun(url)
    }

    async function botRun(url) {
        const page = await browser.newPage();
        try {
        await page.goto(url + '', {waitUntil: 'networkidle2'});
            await page.waitForSelector('#endless > div.endless__item.m-active > div > div > div.layout-article__over > div.layout-article__main > div > div > div.article__header > div.article__title');
            const pageTitle = await page.evaluate(() =>
                document.querySelector('#endless > div.endless__item.m-active > div > div > div.layout-article__over > div.layout-article__main > div > div > div.article__header > div.article__title').innerText
            )
            console.log(pageTitle)

           await page.waitForSelector('#endless > div.endless__item.m-active > div > div > div.layout-article__over > div.layout-article__main > div > div:nth-child(1) > div.article__body.js-mediator-article.mia-analytics');
                const pageText = await page.evaluate(() =>
                    Array.from(document.querySelectorAll('#endless > div.endless__item.m-active > div > div > div.layout-article__over > div.layout-article__main > div > div:nth-child(1) > div.article__body.js-mediator-article.mia-analytics > div[data-type="text"]')).map(res =>res.innerText)

                )
            let rawTextStr = pageText.join()
            console.log(rawTextStr)

            await page.waitForSelector('#endless > div.endless__item.m-active > div > div > div.layout-article__over > div.layout-article__main > div > div:nth-child(1) > div.article__header > div.article__announce > div > div.media__size > div > img');
            const pageImg = await page.evaluate(() =>
                document.querySelector('#endless > div.endless__item.m-active > div > div > div.layout-article__over > div.layout-article__main > div > div:nth-child(1) > div.article__header > div.article__announce > div > div.media__size > div > img').src
            )
            let r = Math.random().toString(4).substring(7)
            downloadImage(pageImg, '/home/web/web-application/client/public/static/img/'+r+'.jpg')
                .then(console.log)
                .catch(console.error);
            console.log("file create")

            upsertPost({
                title: pageTitle,
                text: rawTextStr,
                imgUri: '/static/img/'+r+'.jpg'
            });

    }catch (error) {
            try {

                await page.goto(url + '', {waitUntil: 'networkidle2'})
                await page.waitForSelector('#endless > div.endless__item.m-active > div > div > div.layout-article__over > div.layout-article__main > div > div > div.article__header > h1');
                const pageTitle = await page.evaluate(() =>
                    document.querySelector('#endless > div.endless__item.m-active > div > div > div.layout-article__over > div.layout-article__main > div > div > div.article__header > h1').innerText)
                console.log(pageTitle)


                await page.waitForSelector('#endless > div.endless__item.m-active > div > div > div.layout-article__over > div.layout-article__main > div > div:nth-child(1) > div.article__body.js-mediator-article.mia-analytics');
                const pageText = await page.evaluate(() =>
                    Array.from(document.querySelectorAll('#endless > div.endless__item.m-active > div > div > div.layout-article__over > div.layout-article__main > div > div:nth-child(1) > div.article__body.js-mediator-article.mia-analytics > div[data-type="text"]')).map(res =>res.innerText)

                )
                let rawTextStr = pageText.join()
                console.log(rawTextStr)


                await page.waitForSelector('#endless > div.endless__item.m-active > div > div > div.layout-article__over > div.layout-article__main > div > div:nth-child(1) > div.article__header > div.article__announce > div > div.media__size > div > img');
                const pageImg = await page.evaluate(() =>
                    document.querySelector('#endless > div.endless__item.m-active > div > div > div.layout-article__over > div.layout-article__main > div > div:nth-child(1) > div.article__header > div.article__announce > div > div.media__size > div > img').src
                )
                let r = Math.random().toString(4).substring(7)
                downloadImage(pageImg, '/home/web/web-application/client/public/static/img/'+r+'.jpg')
                    .then(console.log)
                    .catch(console.error);
                console.log("file create")

                upsertPost({
                    title: pageTitle,
                    text: rawTextStr,
                    imgUri: '/static/img/'+r+'.jpg'
                });

            } catch (error) {
                console.error(error);
            }
        }
        await page.close();
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

        // if this email exists, update the entry, don't insert
        // Если почтовый title, обновить экземпляр без добавления
        const conditions = {
            title: postObj.title
        };
        const options = {
            upsert: true,
            new: true,
            setDefaultsOnInsert: true
        };

        User.findOneAndUpdate(conditions, postObj, options, (err, result) => {
            if (err) {
                throw err;
            }
        });
    }
    console.log('Time to execute:' + (end - start)+'ms');
    await browser.close();


})();