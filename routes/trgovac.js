var express = require('express');
var router = express.Router();
const bcrypt = require('bcrypt');
const {Pool} = require('pg');
const fileUpload = require('express-fileupload');
router.use(express.static('public'));
router.use(express.static('upload'));

router.use(fileUpload({
    limits: {fileSize: 50 * 1024 * 1024},
}));

const pool = new Pool({
    user: 'jxdchtrr',
    host: 'abul.db.elephantsql.com',
    database: 'jxdchtrr',
    password: 'zLuSRzNJWoeRNjdtOv70sRL7UxJnP9fe',
    port: 5432,
})
var pomocne = {
    dajGrupe: function (req, res, next) {
        pool.query(`select * from grupa`,
            (err, result) => {
                req.grupe = result.rows;
                next();
            })
    },
    dajTrgovinu: function (req, res, next) {
        pool.query(`select * from ponuda where t.naziv=$1
inner join trgovac t on p.trgovac=t.id`,
            [])
    },
    dajTrgovce: function (req, res, next) {
        pool.query(`select * from trgovac`,
            (err, result) => {
                req.trgovci = result.rows;
                //console.info(result.rows);
                next();
            })
    },
    dajKupce: function (req, res, next) {
        pool.query(`select * from kupac`,
            (err, result) => {
                req.kupci = result.rows;
                //console.info(result.rows);
                next();
            })
    },
    dajBrKupaca: function (req, res, next) {
        pool.query(`select count(*) from kupac`,
            (err, result) => {
                req.brkupaca = result.rows;
                next();
            })
    },
    dajBrTrgovaca: function (req, res, next) {
        pool.query(`select count(*) from trgovac`,
            (err, result) => {
                req.brtrgovaca = result.rows;
                //console.info(result.rows[0].count);
                next();
            })
    },
    dajBrArtikala: function (req, res, next) {
        pool.query(`select count(*) from ponuda`,
            (err, result) => {
                req.brartikala = result.rows;
                next();
            })
    }
}
/* GET users listing. */
router.get('/', pomocne.dajGrupe, async function (req, res, next) {
    let obj = req.cookies.trgovac;
    if (obj) {

        obj = JSON.parse(obj);
        pool.query(`select p.naziv as proizvod, p.*,g.naziv, t.naziv as ime,p.id as ide,p.slika from ponuda p
           inner join trgovac t on p.trgovac = t.id
           inner join grupa g on p.grupa=g.id
            where t.id=$1`,
            [obj.id],
            (err, result) => {
                //console.info(result.rows);
                //console.info(req.grupe)
                //console.info(result.rows);
                if (result.rows.length === 0) {
                    return res.redirect('/trgovac/trgovacprazan')
                } else {
                    res.render('trgovac', {sve: result.rows, grupe: req.grupe, sliba: req.slika})
                }
            })
    } else {
        res.redirect('/login')
    }
});
router.get('/trgovacprazan', pomocne.dajGrupe, function (req, res, next) {
    res.render('trgovacprazan', {grupe: req.grupe})
})


router.delete('/brisi/:proizvod/:trgovac', function (req, res, next) {
    pool.query(`delete from ponuda where naziv=$1 and trgovac=$2`,
        [req.params.proizvod, req.params.trgovac],
        (err, result) => {
            next();
        });
}, function (req, res, next) {
    res.sendStatus(200);
})
router.get('/profil/urediprofiltrgovca', async function (req, res, next) {
    let obj = req.cookies.trgovac;
    obj = JSON.parse(obj);
    //console.info(obj);

    pool.query(`select t.naziv,t.telefon,t.email,t.adresa,t.grad from trgovac t where id=$1`,
        [obj.id],
        (err, result) => {
            req.trgovac = result.rows;
            console.info(req.trgovac);
            res.render('urediprofiltrgovca', {podaci: req.trgovac})
        })
})


router.get('/pricaj/chat', pomocne.dajKupce, function (req, res, next) {
    let obj = JSON.parse(req.cookies.trgovac);
    let objid = obj.id;
    res.render('svikupci', {kupci: req.kupci, trgovac1: obj.id})
})
router.get('/profiltrgovca/naruceni', function (req, res, next) {
    let obj = JSON.parse(req.cookies.trgovac);
    pool.query(`select ko.id as idnar,ko.status as status,p.id as idArt,p.naziv as artikal,p.cijena as cijena,p.slika as slika,k.ime as ime,k.prezime as prezime from korpa ko
    inner join ponuda p on ko.artikal = p.id
    inner join kupac k on ko.kupac = k.id
    where (ko.status='narucen' or ko.status='odbijen' or ko.status='isporucen') and p.trgovac=$1`,
        [obj.id],
        (err, result) => {
            req.naruceni = result.rows;
            console.info(req.naruceni);
            if (result.rows.length > 0) {
                res.render('trgNaruceni', {naruceni: req.naruceni})
            } else {
                res.render('trgNaruceniPrazan')
            }
        })
})
router.get('/poruke/moje', function (req, res, next) {
    let obj = JSON.parse(req.cookies.trgovac);
    pool.query(`select poruka from poruka
    full outer join glavni_admin ga on poruka.od_administratora = ga.id
    where to_trgovac=$1;`, [obj.id],
        (err, result) => {
            req.poruke = result.rows;
            next();
        })
})


module.exports = router;
