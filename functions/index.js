const functions = require("firebase-functions");
const express = require('express')
const fetch = require('node-fetch')
const cors = require('cors')
const { cert } = require('firebase-admin/app')
const { getFirestore } = require('firebase-admin/firestore')
const admin = require('firebase-admin');
const serviceAccount = require("./webflow-api-server-85ba7-firebase-adminsdk-kd166-cb72cc7625.json");

const app = express();
const corsOptions = {
    origin: ["https://marketingtips.webflow.io", "https://www.marketingtips.co.jp"],
    credentials: true
}
app.use(cors(corsOptions))

if (admin.apps.length === 0) {
    admin.initializeApp({
        credential: cert(serviceAccount)
    })
}

const db = getFirestore()
const USER_COLLECTION = "user"
const WEBFLOW_API_KEY = process.env.WEBFLOW_API_KEY;
const blogPostsCollectionID = "6405e65a133ebf3b075a9f4e"
const baseUrl = "https://api.webflow.com";


// - Firestore

//MenberSpace会員IDでコレクションを作成
app.get("/create-user/:menber_space_id/", async (req, res) => {
    const menberSpaceUserID = req.params.menber_space_id;
    const docRef = db.collection(USER_COLLECTION).doc(menberSpaceUserID);
    const data = {
        favoriteArticles: [],
        alreadyReadArticles: []
    }
    docRef.set(data).then(() => {
        res.send('書き込み成功')
    }).catch((e) => {
        res.send("書き込み失敗")
    })
})


// 会員IDに紐付けて既読した記事を追加
app.get("/add-read-articles/:menber_space_id/:read_articles_item_id", async (req, res) => {
    const menberSpaceUserID = req.params.menber_space_id;
    const read_article_item_id = req.params.read_article_item_id;
    const docRef = db.collection(USER_COLLECTION).doc(menberSpaceUserID);
    docRef.get().then((doc) => {
        if (doc.exists) {
            const data = doc.data();
            const readArticleField = data.alreadyReadArticles || [];
            readArticleField.push(read_article_item_id);
            docRef.update({ alreadyReadArticles: readArticleField }).then(() => {
                res.send('書き込み成功')
            }).catch((e) => {
                res.send("書き込み失敗")
            })
        } else {
            console.log("ドキュメントが存在しません");
        }
    }).catch((error) => {
        console.log("エラー: Firestoreドキュメントの取得に失敗しました。", error);
    });
})


// 会員IDに紐付けてお気に入り記事を追加
app.get("/add-favorite-articles/:menber_space_id/:favorite_articles_item_id", async (req, res) => {
    const menberSpaceUserID = req.params.menber_space_id;
    const favoriteArticlesID = req.params.favorite_articles_item_id;
    const docRef = db.collection(USER_COLLECTION).doc(menberSpaceUserID);
    docRef.get().then((doc) => {
        if (doc.exists) {
            const data = doc.data();
            const favoriteArticlesField = data.favoriteArticles || [];
            favoriteArticlesField.push(favoriteArticlesID);
            docRef.update({ favoriteArticles: favoriteArticlesField }).then(() => {
                res.send('success')
            }).catch((e) => {
                res.send("erorr")
            })
        } else {
            console.log("ドキュメントが存在しません");
        }
    }).catch((error) => {
        console.log("エラー: Firestoreドキュメントの取得に失敗しました。", error);
    });
})

// お気に入りの記事を取得
app.get("/get-favorite-articles/:menber_space_id", async (req, res) => {
    const menberSpaceUserID = req.params.menber_space_id;
    const docRef = db.collection(USER_COLLECTION).doc(menberSpaceUserID);
    docRef.get().then((doc) => {
        if (doc.exists) {
            const data = doc.data();
            const favoriteArticlesField = data.favoriteArticles || [];
            res.send(favoriteArticlesField)
        } else {
            res.send("ドキュメントが存在しません")
        }
    }).catch((error) => {
        res.send("エラー: Firestoreドキュメントの取得に失敗しました。", error)
    });
})

// 既読済みの記事を取得
app.get("/get-already-read-articles/:menber_space_id", async (req, res) => {
    const menberSpaceUserID = req.params.menber_space_id;
    const docRef = db.collection(USER_COLLECTION).doc(menberSpaceUserID);
    docRef.get().then((doc) => {
        if (doc.exists) {
            const data = doc.data();
            const alreadyReadArticlesField = data.alreadyReadArticles || [];
            res.send(alreadyReadArticlesField)
        } else {
            res.send("ドキュメントが存在しません")
        }
    }).catch((error) => {
        res.send("エラー: Firestoreドキュメントの取得に失敗しました。", error)
    });
})

// - Webfow

// increment blog-posts total
app.patch('/increment-blog-posts-totalviews/:item_id/:prev_totalviews', async (req, res) => {
    const item_id = req.params.item_id;
    const prevTotalviews = req.params.prev_totalviews;
    const url = baseUrl + `/collections/${blogPostsCollectionID}/items/${item_id}`;
    const patchOptions = {
        method: 'PATCH',
        headers: {
            'accept': 'application/json',
            'content-type': 'application/json',
            'authorization': 'Bearer ' + WEBFLOW_API_KEY,
        },
        body: JSON.stringify({
            fields: { totalviews: Number(prevTotalviews) + 1 }
        })
    };
    try {
        const response = await fetch(url, patchOptions)
        const updatedData = await response.json()
        res.send(updatedData)
    } catch (e) {
        res.send(e)
    }
})


// increment blog-posts rate-counter
app.patch('/increment-blog-posts-rate-counter/:item_id/:prev_total_rate/:prev_rate_counter/:rate', async (req, res) => {
    const item_id = req.params.item_id;
    const prevTotalRate = req.params.prev_total_rate;
    const prevRateCounter = req.params.prev_rate_counter;
    const rate = req.params.rate;
    const url = baseUrl + `/collections/${blogPostsCollectionID}/items/${item_id}`;
    const patchOptions = {
        method: 'PATCH',
        headers: {
            'accept': 'application/json',
            'content-type': 'application/json',
            'authorization': 'Bearer ' + WEBFLOW_API_KEY,
        },
        body: JSON.stringify({
            fields: { 'rate-counter': (Number(prevRateCounter) + Number(rate)), 'total-rate': Number(prevTotalRate) + 1 }
        })
    };
    try {
        const response = await fetch(url, patchOptions)
        const updatedData = await response.json()
        res.send(updatedData)
    } catch (e) {
        res.send(e)
    }
})

exports.v1 = functions.https.onRequest(app);
