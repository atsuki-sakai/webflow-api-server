const functions = require("firebase-functions");
const express = require('express')
const fetch = require('node-fetch')
const cors = require('cors')
const { cert } = require('firebase-admin/app')
const { getFirestore } = require('firebase-admin/firestore')
const admin = require('firebase-admin');
const serviceAccount = require("./webflow-api-server-85ba7-firebase-adminsdk-kd166-cb72cc7625.json");


// -- SETUP

const app = express();
const corsOptions = {
    origin: ["https://www.marketingtips.co.jp", "https://marketingtips.co.jp"],
    credentials: true
}
app.use(cors(corsOptions))

if (admin.apps.length === 0) {
    admin.initializeApp({
        credential: cert(serviceAccount)
    })
}

// -- PROPERTY

const db = getFirestore();
const userCollection = process.env.USER_DOCUMENT_ID;
const webflowApiKey = process.env.WEBFLOW_API_KEY;
const blogpostsCollectionId = process.env.BLOGPOSTS_COLLECTION_ID;
const baseUrl = process.env.BASE_URL;

const webflowHeaders = {
    'accept': 'application/json',
    'content-type': 'application/json',
    'authorization': 'Bearer ' + webflowApiKey,
};


// -- FUNCTIONS

function patchOptions(body) {
    return {
        method: 'PATCH',
        headers: webflowHeaders,
        body: body
    }
};

// ## FIRESTORE

// Add favorite articles associated with your member ID.
app.post("/save-favorite-blog/:member_id", async (req, res) => {
    try {
        const { id, slug, title } = req.body;
        const memberId = req.params.member_id;
        const docRef = db.collection(userCollection).doc(memberId);
        const doc = await docRef.get();
        const userData = doc.exists ? doc.data() : null;
        let favorites = [];

        if (userData && userData.favorites) {
            favorites = userData.favorites;
        }

        if (!favorites.some((blog) => blog.id === id)) {
            favorites.push({ id, slug, title });
        }

        await docRef.set({ favorites: favorites });
    } catch (error) {
        console.error("データの保存中にエラーが発生しました:", error);
        res.status(500).send("エラー: データの保存中にエラーが発生しました。");
    }
});

// Retrieve favorite articles linked to member ID.
app.post("/get-favorite-blog/:member_id", async (req, res) => {
    try {
        const memberId = req.params.member_id;
        const docRef = db.collection(userCollection).doc(memberId);
        const doc = await docRef.get();
        const userData = doc.exists ? doc.data() : null;

        if (userData && userData.favorites) {
            res.send(userData.favorites);
        } else {
            res.send([]);
        }
    } catch (error) {
        console.error("データの取得に失敗しました:", error);
        res.status(500).send("エラー: データの取得に失敗しました。");
    }
});

// Delete favorite articles.
app.post("/delete-favorite-blog/:member_space_id/:blog_item_id", async (req, res) => {
    try {
        const memberSpaceUserID = req.params.member_space_id;
        const itemId = req.params.blog_item_id;
        const docRef = db.collection(userCollection).doc(memberSpaceUserID);
        const doc = await docRef.get();

        if (doc.exists) {
            const userData = doc.data();

            if (userData && userData.favorites) {
                const favorites = userData.favorites;
                const updatedFavorites = favorites.filter(blog => blog.id !== itemId);

                await docRef.update({ favorites: updatedFavorites });
                res.send("ブログデータの削除に成功しました。");
                return;
            }
        }

        res.status(404).send("指定されたユーザーまたは削除したいブログが見つかりません。")
    } catch (error) {
        console.error("ブログデータの削除中にエラーが発生しました:", error);
        res.status(500).send("エラー: ブログデータの削除中にエラーが発生しました。");
    }
});


// ## WEBFLOW


// Increment blog-posts totalviews
app.patch('/increment-blog-posts-totalviews/:item_id/:prev_totalviews', async (req, res) => {
    try {
        const item_id = req.params.item_id;
        const prevTotalviews = req.params.prev_totalviews;
        const url = baseUrl + `/collections/${blogpostsCollectionId}/items/${item_id}`;
        const body = JSON.stringify({
            fields: { totalviews: Number(prevTotalviews) + 1 }
        });
        const options = patchOptions(body);
        const response = await fetch(url, options)
        const updatedData = await response.json()
        res.send(updatedData)
    } catch (e) {
        res.send(e)
    }
})

// Increment blog-posts rate-counter
app.patch('/increment-blog-posts-rate-counter/:item_id/:prev_total_rate/:prev_rate_counter/:rate', async (req, res) => {
    try {
        const itemId = req.params.item_id;
        const prevTotalRate = req.params.prev_total_rate;
        const prevRateCounter = req.params.prev_rate_counter;
        const rate = req.params.rate;
        const url = baseUrl + `/collections/${blogpostsCollectionId}/items/${itemId}`;
        const body = JSON.stringify({
            fields: { 'rate-counter': (Number(prevRateCounter) + Number(rate)), 'total-rate': Number(prevTotalRate) + 1 }
        });
        const options = patchOptions(body)
        const response = await fetch(url, options)
        const updatedData = await response.json()
        res.send(updatedData)
    } catch (e) {
        res.send(e)
    }
})

// Increment blog-posts favorite
app.patch('/increment-blog-posts-favorite/:item_id/:prev_favorite', async (req, res) => {
    try {
        const itemId = req.params.item_id;
        const prevFavorite = req.params.prev_favorite;
        const url = baseUrl + `/collections/${blogpostsCollectionId}/items/${itemId}`;
        const body = JSON.stringify({
            fields: { 'favorite-4': (Number(prevFavorite) + 1) }
        });
        const options = patchOptions(body);
        const response = await fetch(url, options)
        const updatedData = await response.json()
        res.send(updatedData)
    } catch (e) {
        res.send(e)
    }
})

// Decrement blog-posts favorite
app.patch('/decrement-blog-posts-favorite/:item_id/:prev_favorite', async (req, res) => {
    try {
        const itemId = req.params.item_id;
        const prevFavorite = req.params.prev_favorite;
        const url = baseUrl + `/collections/${blogpostsCollectionId}/items/${itemId}`;
        const body = JSON.stringify({
            fields: { 'favorite-4': (Number(prevFavorite) - 1) }
        });
        const options = patchOptions(body)
        const response = await fetch(url, options)
        const updatedData = await response.json()
        res.send(updatedData)
    } catch (e) {
        res.send(e)
    }
})

const region = 'asia-northeast1';
exports.webflowApi = functions.region(region).https.onRequest(app);