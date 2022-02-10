var express = require('express');
var router = express.Router();
const bcrypt = require('bcrypt');
const {Pool} = require('pg');
router.use(express.static('public'));
router.use(express.static('upload'));
var io = null;
var poruke = [];
var prvi_id = null;

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
    dajBrArtikala: async function (req, res, next) {
        pool.query(`select count(*) from ponuda`,
            (err, result) => {
                req.brartikala = result.rows[0].count;
                next();
            })
    },
    dajArtikle: async function (req, res, next) {
        pool.query(`select g.naziv as kategorija,t.naziv as trgovac,p.naziv as artikal,p.cijena,p.slika,p.id from zainteresovanost z 
        inner join grupa g on z.grupa=g.id
        inner join ponuda p on g.id=p.grupa
        inner join trgovac t on p.trgovac=t.id
        order by random() limit 5`,
            (err, result) => {
                req.randomart = result.rows;
                next();
            })
    }

}

router.get('/', pomocne.dajArtikle, function (req, res, next) {
    let obj = req.cookies.kupac;
    if (obj) {
        obj = JSON.parse(obj);
        //console.info(req.randomart);
        //console.info(req.brartikala);
        //console.info(obj.id)
        pool.query(`select g.naziv as kategorija,t.naziv as trgovac,p.naziv as artikal,p.cijena,p.slika,p.id from zainteresovanost z 
        inner join grupa g on z.grupa=g.id
        inner join ponuda p on g.id=p.grupa
        inner join trgovac t on p.trgovac=t.id
        where z.kupac=$1`,
            [obj.id],
            (err, result) => {
                //console.info(result.rows)
                res.render('kupac', {sve: result.rows, rand: req.randomart});
            })

    } else {
        res.redirect('/login');
    }
});

router.get('/sortiraj', pomocne.dajArtikle, function (req, res, next) {
    //console.info(req.query.sortiraj);
    let sortPo = req.query.sortiraj;
    console.info(sortPo);
    let obj = req.cookies.kupac;
    if (obj) {
        obj = JSON.parse(obj);
        //console.info(req.randomart);
        //console.info(req.brartikala);
        //console.info(obj.id)
        pool.query(`select g.naziv as kategorija,t.naziv as trgovac,p.naziv as artikal,p.cijena,p.slika,p.id from zainteresovanost z 
        inner join grupa g on z.grupa=g.id
        inner join ponuda p on g.id=p.grupa
        inner join trgovac t on p.trgovac=t.id
        where z.kupac=$1
        order by ${sortPo}`,
            [obj.id],
            (err, result) => {
                //console.info(result.rows)
                res.render('kupac', {sve: result.rows, rand: req.randomart});
            })

    } else {
        res.redirect('/login');
    }
})

router.get('/:radnja', function (req, res, next) {

    pool.query(`select 
        p.id as ajd,
        p.naziv as artikal,
        p.stanje as kolicina,
        g.naziv as kategorija,
        t.naziv as ime,
        t.adresa as adresa,
        t.email as email,
        t.grad as grad,
        t.telefon as telefon,
        p.cijena
        from ponuda p
            inner join trgovac t on p.trgovac=t.id
            inner join grupa g on p.grupa=g.id
            where t.naziv=$1`,
        [req.params.radnja],
        (err, result) => {
            req.trgovac = result.rows;
            //console.info(result.rows)
            if (result.rows.length > 0) {
                return res.render('pogledaj', {sve: result.rows})
            } else {
                pool.query(`select
                    t.naziv as ime,
                    t.adresa as adresa,
                    t.email as email,
                    t.grad as grad,
                    t.telefon as telefon
                    from trgovac t
                        where t.naziv=$1`,
                    [req.params.radnja],
                    (err, result) => {
                        req.trgovina = result.rows;
                        console.info(result.rows)
                        return res.render('pogledajprazan', {podaci: req.trgovina});

                    })
            }
        })

})

router.get('/:radnja/sortiraj', function (req, res, next) {
    let sortirajPo = req.query.sortiraj;
    console.info(sortirajPo)
    pool.query(`select 
        p.id as ajd,
        p.naziv as artikal,
        p.stanje as kolicina,
        g.naziv as kategorija,
        t.naziv as ime,
        t.adresa as adresa,
        t.email as email,
        t.grad as grad,
        t.telefon as telefon,
        p.cijena
        from ponuda p
            inner join trgovac t on p.trgovac=t.id
            inner join grupa g on p.grupa=g.id
            where t.naziv=$1
            order by ${sortirajPo}`,
        [req.params.radnja],
        (err, result) => {
            req.trgovac = result.rows;
            //console.info(result.rows)
            if (result.rows.length > 0) {
                return res.render('pogledaj', {sve: result.rows})
            } else {
                pool.query(`select
                    t.naziv as ime,
                    t.adresa as adresa,
                    t.email as email,
                    t.grad as grad,
                    t.telefon as telefon
                    from trgovac t
                        where t.naziv=$1`,
                    [req.params.radnja],
                    (err, result) => {
                        req.trgovina = result.rows;
                        console.info(result.rows)
                        return res.render('pogledajprazan', {podaci: req.trgovina});

                    })
            }
        })
})

router.post('/:radnja', function (req, res, next) {
    let obj = JSON.parse(req.cookies.kupac);
    //console.info(obj.id);
    pool.query(`select t.id from trgovac t where t.naziv=$1`,
        [req.params.radnja],
        (err, result) => {
            //console.info(result.rows[0].id);
            pool.query(`insert into poruka (poruka,od_trgovca,to_trgovac)
           values($1,$2,$3)`,
                [req.body.poruka, obj.id, result.rows[0].id])
        })
    res.sendStatus(200);
})
router.get('/pricaj/chat', pomocne.dajTrgovce, function (req, res, next) {
    let obj = JSON.parse(req.cookies.kupac);
    let objid = obj.id;
    res.render('svitrgovci', {trgovci: req.trgovci, kupac1: obj.id})
})
router.get('/profil/korpa', async function (req, res, next) {
    let obj = JSON.parse(req.cookies.kupac);
    let objid = obj.id;
    pool.query(`select  sum(p.cijena) as zbir from korpa
inner join kupac k on korpa.kupac = k.id
inner join ponuda p on korpa.artikal = p.id
inner join trgovac t on p.trgovac = t.id
where kupac=$1 and korpa.status='korpa'`,
        [obj.id],
        async (err, result) => {
            req.zbir = result.rows;
        });
    pool.query(`select p.naziv,t.naziv as trgovacc,p.cijena,artikal,korpa.id,p.slika from korpa
    inner join kupac k on korpa.kupac = k.id
    inner join ponuda p on korpa.artikal = p.id
    inner join trgovac t on p.trgovac = t.id
where kupac=$1 and korpa.status='korpa'`,
        [obj.id],
        async (err, result) => {
            req.mojakorpa = result.rows;
            //console.info(req.mojakorpa);
            if (result.rows.length > 0) {
                res.render('korpa', {podaci: req.mojakorpa, zbir: req.zbir})
            } else {
                res.render('korpaPrazna')
            }
        })
})

router.get('/profil/urediprofilkupca', async function (req, res, next) {
    let obj = req.cookies.kupac;
    obj = JSON.parse(obj);
    console.info(obj);
    pool.query(`select k.ime,k.prezime,k.email from kupac k where id=$1`,
        [obj.id],
        (err, result) => {
            req.kupac = result.rows;
            console.info(req.kupac);
            res.render('urediprofilkupca', {podaci: req.kupac})
        })
})
router.get('/pretraga/neka', function (req, res, next) {
    res.render('pretraga');
})
router.get('/profil/narudzbe', function (req, res, next) {
    let obj = JSON.parse(req.cookies.kupac);
    pool.query(`select ko.id as idNar, p.id as idArt,p.naziv as artikal,p.cijena as cijena,p.slika as slika,t.naziv as ime,ko.status as status from korpa ko
    inner join ponuda p on ko.artikal = p.id
    inner join kupac k on ko.kupac = k.id
    inner join trgovac t on p.trgovac = t.id
    where ko.status='narucen' and ko.kupac=$1`,
        [obj.id],
        (err, result) => {
            req.narucio = result.rows;
            console.info(req.narucio);
            if (result.rows.length > 0) {
                res.render('kupacNarucio', {naruceni: req.narucio});

            } else {
                res.render('kupacNarucioPrazan')
            }
        })
})


module.exports = router;
