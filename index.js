"use strict"
const cyrillicToTranslit = require('cyrillic-to-translit-js')
const translate = require('@iamtraction/google-translate');
const fetch = require('node-fetch');
const puppeteer = require('puppeteer');
const fs = require('fs');
const sharp = require('sharp');
const Axios = require('axios')
const mongoose = require('mongoose');
const Post = require('./models/Post');
const Dir = require('./models/Dir')
const axios = require("axios");
const Sharp = require("sharp");
const FormData = require("form-data");
const iPhone = puppeteer.devices['iPhone 6'];


const start= new Date().getTime();
(async () => {
    let count = 0;
    console.log("script started")
    const  urlArray = ['https://ria.ru/politics/','https://ria.ru/economy/','https://ria.ru/society/','https://lenta.ru/rubrics/science/science/']
    for (let index = 0; index < urlArray.length; ++index) {
        const browser = await puppeteer.launch({
            executablePath: '/usr/bin/chromium-browser',
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--single-process',
                '--disable-gpu'
            ],
            //slowMo: 500,
        });
        const page = await browser.newPage();
        //await page.emulate(iPhone);
        await page.goto(urlArray[index],{ waitUntil: 'networkidle2' });
        if(urlArray[index]==='https://lenta.ru/rubrics/science/science/'){
            const Href = await page.evaluate(() => Array.from(document.querySelectorAll(
                '#body > div.layout.js-layout > div.layout__container > main > div > section > ul > li > a')).map(res =>
                res.href))
            console.log(Href)
            await page.close()
            for(let url of Href) {
                const s1 = 'https://lenta.ru/';
                const s2 = url.slice(0, 17);
                if (s1.toLowerCase() === s2.toLowerCase()){
                    console.log("iteration num: "+index)
                    await botRunLenta(url,browser)
                }
            }
            await browser.close();
        }else {
            const Href = await page.evaluate(() => Array.from(document.querySelectorAll('#content > div > div.layout-rubric__main > div > div.list.list-tags > div > div.list-item__content > a.list-item__title.color-font-hover-only')).map(res =>
                res.href.trim()))
            await page.close()

            for(let url of Href) {
                const s1 = 'https://ria.ru/';
                const s2 = url.slice(0, 15);
                if (s1.toLowerCase() === s2.toLowerCase()){
                    console.log("iteration num: "+index)
                    await botRun(url,browser)
                }
            }
            await browser.close();
        }

        //console.log("urlarr ---  "+urlArray[index])
    }
    const end = new Date().getTime();

//-----------------------function start---------------------------------------
    async function botRun(url,browser) {
        incrementCount();
        console.log(count)
        try {
            console.log("link: "+url)
            const page = await browser.newPage();
            await page.setDefaultNavigationTimeout(0);
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
            //console.log(pageTag)
            await page.waitForSelector('[class="article__info-date"]');
            const pageTime_date = await page.evaluate(() =>
                document.querySelector('[class="article__info-date"]').innerText
            )
            const time = pageTime_date.substr(0,5)
            const date = pageTime_date.substr(6,15)

            //console.log(date + " --- " + _y+" "+_m+" "+_d)
            await page.waitForSelector('#endless > div > div > div > div.layout-article__over > div.layout-article__main > div > div:nth-child(1) > div.article__header > div.article__announce > div > div.media__size > div > img');
            const pageImg = await page.evaluate(() =>
                document.querySelector('#endless > div > div > div > div.layout-article__over > div.layout-article__main > div > div:nth-child(1) > div.article__header > div.article__announce > div > div.media__size > div > img').src
            )
            //console.log(pageImg)
            const today = new Date();
            const d = today.getUTCDate();
            const m = today.getUTCMonth();
            const y = today.getFullYear();
            const name = cyrillicToTranslit().transform(pageTitle,'_').toLowerCase()
            let r = d+'_'+m+'_'+y+'_'+name.substr(0,15);
            const enTag = pageTag.map(el=>cyrillicToTranslit().transform(el,'_').toLowerCase())
            //console.log(enTag)
            const pageId = r
            //console.log(pageId)

            
            /*downloadImage(pageImg, /!*'/home/web/web-application/client/public/static/img/'+r+'.jpg'*!/     /!*'/Users/gleb/Desktop/web-application/client/public/static/img/'+r+'.jpg'*!/ '/Users/gleb/Desktop/img/'+r+'.webp')
                .then(console.log)
                .catch(console.error);*/
            console.log("start send img")

            const imguruImage  = await downloadImagesharp(pageImg, '/Users/gleb/Desktop/img/' + r + '.jpeg').then("ll"+console.log).catch(console.error)
            console.log("link img: "+imguruImage)
            const textEn = pageText.join(' ')
            const category = await query({"inputs": textEn, "parameters": {"candidate_labels": ['Наука', 'Политика','Общество','Экономика']}}).then((response) => {
                console.log(JSON.stringify(response));
                console.log(response["labels"][0])
                return response["labels"][0]
            });
            postTodb(
                pageId,
                pageTitle,
                pageText,
                category,
                imguruImage,
                pageTag,
                enTag,
                time,
                date,
            )
            for (let l=0;l<pageTag.length;l++){
                upsertDir({
                    keywords: pageTag[l],
                    en_keywords: enTag[l],
                })
            }
            await page.close()
            if (count>49){
                await delayedGreeting(3600000);
                setincrementCount(0)
            }
        }catch (error) {
            console.log(error)
        }
    }
    async function botRunLenta(url,browser) {
        incrementCount();
        console.log(count)
        try {
            console.log("link: "+url)
            const page = await browser.newPage();
            await page.setDefaultNavigationTimeout(0);
            await page.goto(url + '', {waitUntil: 'domcontentloaded'});
            await page.waitForSelector('[class="topic-body__titles"]');
            const pageTitle = await page.evaluate(() =>
                document.querySelector('[class="topic-body__titles"]').innerText
            )
            console.log(pageTitle)
            await page.waitForSelector('[class="topic-body__content"]');
            const pageText = await page.evaluate(() =>
                Array.from(document.querySelectorAll('[class="topic-body__content"]')).map(res => res.innerText)
            )
            let rawTextStr = pageText.join()
            console.log(rawTextStr)
            //console.log(pageTag)
            await page.waitForSelector('img[class="picture__image"]');
            const pageImg = await page.evaluate(() =>
                document.querySelector('img[class="picture__image"]').src
            )
            console.log(pageImg)
            const today = new Date();
            const d = today.getUTCDate();
            const m = today.getUTCMonth();
            const y = today.getFullYear();
            const name = cyrillicToTranslit().transform(pageTitle,'_').toLowerCase()
            let r = d+'_'+m+'_'+y+'_'+name.substr(0,15);
            //console.log(enTag)
            const pageId = r
            //console.log(pageId)
            const imguruImage  = await downloadImagesharp(pageImg, '/Users/gleb/Desktop/img/' + r + '.jpeg').then("ll"+console.log).catch(console.error)
            /*downloadImage(pageImg, /!*'/home/web/web-application/client/public/static/img/'+r+'.jpg'*!/     /!*'/Users/gleb/Desktop/web-application/client/public/static/img/'+r+'.jpg'*!/ '/Users/gleb/Desktop/img/'+r+'.webp')
                .then(console.log)
                .catch(console.error);*/
            console.log("start send img")
            const textEn = pageText.join(' ')
            const category = await query({"inputs": textEn, "parameters": {"candidate_labels": ['Наука', 'Политика','Общество','Экономика']}}).then((response) => {
                console.log(JSON.stringify(response));
                console.log(response["labels"][0])
                if (response["labels"][0]==='Наука'){
                    return response["labels"][0]
                }else {
                    return 'Наука'
                }
            });
            const catEn = cyrillicToTranslit().transform(category).toLowerCase()
            postTodb(
                pageId,
                pageTitle,
                pageText,
                category,
                imguruImage,
                category,
                catEn,
                " ",
                " ",
            )
            upsertDir({
                keywords: category,
                en_keywords: catEn,
            })
            await page.close()
            if (count>49){
                await delayedGreeting(3600000);
                setincrementCount(0)
            }
        }catch (error) {
            console.log(error)
        }
    }


 //--------------------------------------SCRIPT END----------------------------------------


    async function downloadImagesharp(url){
        const imageResponse = await axios({url: url,method: 'GET', responseType: 'stream'});
        const src = imageResponse.data.pipe(sharp())
        console.log("get pipe")
        try {
            await src.jpeg()
            await src.toBuffer()
            console.log("saved to buffer")
        } catch(e) {
            console.log(e)
        }
        const data = new FormData();
        data.append('image', src);
        const config = {
            method: 'post',
            url: 'https://api.imgur.com/3/image',
            headers: {
                'Authorization': 'Client-ID 8c3ae86e838b9a2',
                ...data.getHeaders()
            },
            data: data
        };
        return await axios(config)
            .then(function (response) {
                console.log(response.data.data.link)
                return response.data.data.link
            })
            .catch(function (error) {
                console.log(error);
            })
    }

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
    async function translate_en(text){
        return await translate(text, {to: 'en'}).then(res => {
            return res.text
        }).catch(err => {
            console.error(err);
        })
    }

    async function query(data) {
        const response = await fetch(
            "https://api-inference.huggingface.co/models/MoritzLaurer/mDeBERTa-v3-base-mnli-xnli",
            {
                headers: { Authorization: "Bearer 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" },
                method: "POST",
                body: JSON.stringify(data),
            }
        );
        const result = response.json();
        return result;
    }

    function setincrementCount(si){
        count=si
    }
    function incrementCount(){
        count++;
    }
    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    async function delayedGreeting(ms) {
        console.log("подожди "+((ms/1000)/60)+" минут");
        await sleep(ms);
        console.log("поток разморожен");
    }
    function postTodbLenta(pageId,pageTitle,pageText,pageTexten,imguruImage,pageTag,enTag,time,date){
        if (pageId !=null && pageTitle !=null && pageText !=null && pageTexten !=null){
            upsertPost({
                id: pageId,
                title: pageTitle,
                text: pageText,
                texten: pageTexten,
            });
        }

        if (pageId !=null && pageTitle !=null && pageText !=null && pageTexten !=null && imguruImage !=null && pageTag !=null && enTag !=null && time !=null && date !=null){
            upsertPost({
                id: pageId,
                title: pageTitle,
                text: pageText,
                texten: pageTexten,
                imgUri: imguruImage,
                keywords: pageTag,
                en_keywords: enTag,
                time: time,
                date: date,
            });
            console.log("post to db")
        }else {
            console.log("dont post to db")
        }
    }
    function postTodb(pageId,pageTitle,pageText,pageTexten,imguruImage,pageTag,enTag,time,date){
        if (pageId !=null && pageTitle !=null && pageText !=null && pageTexten !=null && imguruImage !=null && pageTag !=null && enTag !=null && time !=null && date !=null){
            upsertPost({
                id: pageId,
                title: pageTitle,
                text: pageText,
                texten: pageTexten,
                imgUri: imguruImage,
                keywords: pageTag,
                en_keywords: enTag,
                time: time,
                date: date,
            });
            console.log("post to db")
        }else {
            console.log("dont post to db")
        }
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
    function upsertDir(postObj) {
        const DB_URL = 'mongodb://127.0.0.1:27017/?directConnection=true&serverSelectionTimeoutMS=2000';
        //const DB_URL = 'mongodb://192.168.5.125:27017/?directConnection=true&serverSelectionTimeoutMS=2000';
        if (mongoose.connection.readyState === 0) {
            mongoose.connect(DB_URL);
        }

        // if this title exists, update the entry, don't insert
        // Если  title, обновить экземпляр без добавления
        const conditions = {
            keywords: postObj.keywords
        };
        const options = {
            upsert: true,
            new: true,
            setDefaultsOnInsert: true
        };

        Dir.findOneAndUpdate(conditions, postObj, options, (err, result) => {
            if (err) {
                throw err;
            }
        });
    }
    console.log('Time to execute:' + (end - start)/1000 +'sec');
})();
