const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const mongoose = require('mongoose');
const User = require('./models/Post');
const https = require("https");
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
            const transt=translit(pageTitle)
            const file = fs.createWriteStream('/home/web/web-application/client/public/static/img'+transt+'.jpg')
            const request = https.get(pageImg+'',responce =>{
                responce.pipe(file)
            })
            //await sharp(request).jpeg().toFile('/Users/glebvodolazkin/Desktop/web-application/client/public/static/img/'+transt+'.jpg')
            console.log("file create")

            upsertUser({
                title: pageTitle,
                text: rawTextStr,
                imgUri: 'static/img/'+transt+'.jpg'
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
                const transt=translit(pageTitle)
                const file = fs.createWriteStream('/home/web/web-application/client/public/static/img'+transt+'.jpg')
                const request = https.get(pageImg+'',responce =>{
                    responce.pipe(file)
                })
                //await sharp(request).jpeg().toFile('/Users/glebvodolazkin/Desktop/web-application/client/public/static/img/'+transt+'.jpg')
                console.log("file create")

                upsertUser({
                    title: pageTitle,
                    text: rawTextStr,
                    imgUri: 'static/img/'+transt+'.jpg'
                });

            } catch (error) {
                console.error(error);
            }


        }
        await page.close();

    }
    const end = new Date().getTime();
    function translit(str)
    {
        var ru=("А-а-Б-б-В-в-Ґ-ґ-Г-г-Д-д-Е-е-Ё-ё-Є-є-Ж-ж-З-з-И-и-І-і-Ї-ї-Й-й-К-к-Л-л-М-м-Н-н-О-о-П-п-Р-р-С-с-Т-т-У-у-Ф-ф-Х-х-Ц-ц-Ч-ч-Ш-ш-Щ-щ-Ъ-ъ-Ы-ы-Ь-ь-Э-э-Ю-ю-Я-я").split("-")
        var en=("A-a-B-b-V-v-G-g-G-g-D-d-E-e-E-e-E-e-ZH-zh-Z-z-I-i-I-i-I-i-J-j-K-k-L-l-M-m-N-n-O-o-P-p-R-r-S-s-T-t-U-u-F-f-H-h-TS-ts-CH-ch-SH-sh-SCH-sch-'-'-Y-y-'-'-E-e-YU-yu-YA-ya").split("-")
        var res = '';
        for(var i=0, l=str.length; i<l; i++)
        {
            var s = str.charAt(i), n = ru.indexOf(s);
            if(n >= 0) { res += en[n]; }
            else { res += s; }
        }
        return res;
    }
    function upsertUser(postObj) {

        const DB_URL = 'mongodb://127.0.0.1:27017/?directConnection=true&serverSelectionTimeoutMS=2000';
        if (mongoose.connection.readyState === 0) {
            mongoose.connect(DB_URL);
        }

        // if this email exists, update the entry, don't insert
        // Если почтовый ящик существует, обновить экземпляр без добавления
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
    //await browser.close();


})();