var express = require('express');
var router = express.Router();
const bcrypt = require('bcrypt');
const {Pool} = require('pg');
const moment = require('moment');


var io = null;
var poruke = [];
var prvi_id = null;

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
    dajGrupe1: function (req, res, next) {
        pool.query(`select g.naziv as imegr, tp.naziv as tipusluge
        from grupa g
         inner join tip_artikla tp on g.tip_grupe=tp.id`,
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
    },
    dajTipove: function (req, res, next) {
        pool.query(`select ta.naziv,count(*) as broj from ponuda p
        inner join grupa g on p.grupa = g.id
        inner join tip_artikla ta on g.tip_grupe = ta.id
        group by ta.naziv`,
            (err, result) => {
                req.statGr = result.rows;
                next();
            })
    }
}
router.get('/', function (req, res, next) {
    res.render('index', {title: 'Express'});
});
router.get('/registertrg', function (req, res, next) {
    res.render('registertrg');
});
router.get('/registerkup', pomocne.dajGrupe, function (req, res, next) {

    res.render('registerkup', {grupe: req.grupe});
});
router.post('/registertrg', (req, res, next) => {

        if (validUser(req.body)) {
            pool.query(`select * from trgovac where email=$1`,
                [req.body.email],
                (err, result) => {
                    req.trg = result.rows;
                    next();
                })
        } else return res.send('Molimo Vas unesite sve podatke')
    },
    function (req, res, next) {
        if (req.trg.length === 0) {
            let hashPassword = bcrypt.hashSync(req.body.password, 10);
            pool.query(`insert into trgovac (naziv,telefon,email,grad,adresa,password,profilna) values ($1,$2,$3,$4,$5,$6,$7) returning id`,
                [req.body.naziv, req.body.telefon, req.body.email, req.body.grad, req.body.adresa, hashPassword, 'nopicture.jpg'],
                (err, result) => {
                    if (err) res.send(err);
                    req.AJDI = result.rows[0].id
                    next();
                }
            );
        } else {
            res.send('Izaberite novi email, email koji ste unijeli je u upotrebi');
        }
    },
    function (req, res, next) {
        let sampleFile;
        let uploadPath;
        if (!req.files || Object.keys(req.files).length === 0) {
            pool.query(`update trgovac set profilna=$1 where id=$2`,
                ['nopicture.jpg', req.AJDI],
                (err, result) => {
                    next();
                });
        } else {
            sampleFile = req.files.sampleFile;
            uploadPath = __dirname + '/../public/images/' + sampleFile.name;
            sampleFile.mv(uploadPath, function (err) {
                if (err) return res.status(500).send(err);
                pool.query(`update trgovac set profilna=$1 where id=$2`,
                    [sampleFile.name, req.AJDI],
                    (err, result) => {
                        next();
                    })
            });
        }

    }, function (req, res, next) {
        res.redirect('/login')
    });

function setCharAt(slika, i, x) {
    if (i > slika.length - 1) return slika;
    return slika.substring(0, i) + x + slika.substring(i + 1);
}

router.post('/registerkup', function (req, res, next) {

        if (req.body.ime === '' || req.body.prezime === '' || req.body.email === '') {
            return res.redirect('/registerkup');
        } else
            pool.query(`select * from kupac where email=$1`,
                [req.body.email],
                (err, result) => {
                    req.kupac = result.rows;
                    next();
                })
    },
    (req, res, next) => {
        if (req.kupac.length === 0) {
            let hashPassword = bcrypt.hashSync(req.body.password, 10);
            pool.query(`insert into kupac(email,password,ime,prezime,slikak) values ($1,$2,$3,$4,$5) returning id`,
                [req.body.email, hashPassword, req.body.ime, req.body.prezime, 'nopicture.jpg'],
                (err, result) => {
                    req.ajd = result.rows[0].id;
                    next();
                })
        }
    },
    function (req, res, next) {
        let sampleFile;
        let uploadPath;
        let slikaKupca;
        if (!req.files || Object.keys(req.files).length === 0) {
            pool.query(`update kupac set slikak=$1 where id=$2`,
                ['nopicture.jpg', req.ajd],
                (err, result) => {
                    next();
                });
        } else {
            sampleFile = req.files.sampleFile;
            let nastavak = "." + sampleFile.mimetype.substring(6);
            slikaKupca = bcrypt.hashSync(sampleFile.name, 10) + nastavak;
            for (let i = 0; i < slikaKupca.length; i++) {
                if (slikaKupca[i] === '/') {
                    slikaKupca = setCharAt(slikaKupca, i, 'X');
                }
            }
            uploadPath = __dirname + '/../public/images/' + slikaKupca;
            sampleFile.mv(uploadPath, function (err) {
                if (err) return res.status(500).send(err);
                pool.query(`update kupac set slikak=$1 where id=$2`,
                    [slikaKupca, req.ajd],
                    (err, result) => {
                        next();
                    })
            });
        }

    },
    async (req, res, next) => {
        if (req.body.zainteresovanost.length > 0) {


            for (let i = 0; i < req.body.zainteresovanost.length; i++) {
                try {
                    await pool.query(`insert into zainteresovanost (kupac,grupa) values($1,$2)`,
                        [req.ajd, parseInt(req.body.zainteresovanost[i])]);
                } catch (error) {
                    console.info(error);
                }
            }
            next();
        }
        next();
    },
    (req, res, next) => {
        res.redirect('/login')
    })
router.get('/login', function (req, res, next) {
    res.render('login')
});

router.post('/login', function (req, res, next) {
    let now = moment(Date.now()).format('YYYY-MM-DD HH:mm:ss');
    let sada = moment(now, 'YYYY-MM-DD HH:mm:ss');
    if (req.body.email === 'admin' && req.body.password === 'admin') {
        pool.query(`select * from glavni_admin`,
            (err, result) => {
                let loginpodaci = result.rows[0];
                res.cookie('admin', JSON.stringify(loginpodaci));
                res.redirect('/admin')
            })
    }
        //Pogledaj postoji li e mail u trgovcima, ako postoji loguj ga kao trgovac, ako ne postoji onda gledaj u kupcima, ako ne postoji
    // ni tu onda je pogresan email..
    else
        pool.query(`select * from trgovac where email=$1`,
            [req.body.email],
            (err, result) => {
                if (result.rows.length > 0) {
                    //console.info(result.rows[0]);
                    let vrijeme = moment(result.rows[0].vrijeme, 'YYYY-MM-DD HH:mm:ss');
                    if (vrijeme.isAfter(sada)) {
                        return res.send("Blokirani ste " + result.rows[0].naziv);
                    } else {
                        bcrypt.compare(req.body.password, result.rows[0].password, (err, resultt) => {
                            if (resultt) {
                                let logindata = result.rows[0];
                                res.cookie('trgovac', JSON.stringify(logindata));
                                res.redirect('/trgovac')

                            } else {
                                return res.redirect('/login')
                            }
                        })
                    }

                } else if (result.rows.length === 0) {
                    pool.query(`select * from kupac where email=$1`,
                        [req.body.email],
                        (err, result) => {
                            if (result.rows.length > 0) {
                                if (result.rows[0].vrijeme > sada) {
                                    return res.redirect('/login');
                                }
                                //console.info(result.rows[0]);
                                bcrypt.compare(req.body.password, result.rows[0].password, (err, resultt) => {
                                    if (resultt) {
                                        let logindata = result.rows[0];
                                        res.cookie('kupac', JSON.stringify(logindata));
                                        res.redirect('/kupac')
                                    } else {
                                        return res.redirect('/login')
                                    }
                                })
                            } else {
                                console.info('Unesite druge podatke');
                                return res.redirect('/login');
                            }
                        })
                }
            }
        )
})
router.get('/admin', function (req, res, next) {
    let obj = req.cookies.admin;
    if (obj) {
        res.render('admin')

    } else {
        return res.sendStatus(401);
    }
});

router.get('/admin/korisnici', pomocne.dajTrgovce, pomocne.dajKupce, function (req, res, next) {
    let obj = req.cookies.admin;
    if (obj) {
        return res.render('admin-korisnici', {trgovci: req.trgovci, kupci: req.kupci})
    }
    return res.redirect('/login')
})
router.get('/admin/korisnici/:ime', function (req, res, next) {
    let obj = req.cookies.admin;
    if (obj) {
        pool.query(`select p.naziv as artikal,
        p.stanje as kolicina,
        g.naziv as kategorija,
        t.naziv as ime,
        t.adresa as adresa,
        t.email as email,
        t.grad as grad,
        t.telefon as telefon
        from ponuda p
            inner join trgovac t on p.trgovac=t.id
            inner join grupa g on p.grupa=g.id
            where t.naziv=$1`,
            [req.params.ime],
            (err, result) => {
                req.trgovac = result.rows;
                //console.info(result.rows)
                if (result.rows.length > 0) {
                    res.render('pogledajadmin', {sve: result.rows})
                } else {
                    pool.query(`select 
                    t.naziv as ime,
                    t.adresa as adresa,
                    t.email as email,
                    t.grad as grad,
                    t.telefon as telefon
                    from trgovac t
                    where t.naziv=$1`,
                        [req.params.ime],
                        (err, result) => {
                            req.prazni = result.rows;
                            console.info(req.prazni)
                            res.render('pogledajadminprazan', {sve: req.prazni});
                        })

                }
            })
    } else
        return res.redirect('/login');
});

router.post('/admin/korisnici/:ime', function (req, res, next) {
    let obj = JSON.parse(req.cookies.admin);
    //console.info(obj.id);
    pool.query(`select t.id from trgovac t where t.naziv=$1`,
        [req.params.ime],
        (err, result) => {
            //console.info(result.rows);
            pool.query(`insert into poruka (poruka,od_administratora,to_trgovac)
           values($1,$2,$3)`,
                [req.body.poruka, obj.id, result.rows[0].id])
        })
    return res.redirect('/admin')
});

router.get('/admin/statistika', pomocne.dajTrgovce, pomocne.dajTipove, pomocne.dajKupce, pomocne.dajBrTrgovaca, pomocne.dajBrKupaca, pomocne.dajBrArtikala, function (req, res, next) {
    let obj = req.cookies.admin
    if (obj) {
        return res.render('statistika', {
            brkupaca: req.brkupaca,
            brtrgovaca: req.brtrgovaca,
            brartikala: req.brartikala,
            statGr: req.statGr
        });
    }
    return res.redirect('/login')
})
//____________________________________________________________________________//
router.post('/admin/blokirajtrg/:ime', function (req, res, next) {
    let now = moment(Date.now()).format('YYYY-MM-DD HH:mm:ss');
    let sada = moment(now, 'YYYY-MM-DD HH:mm:ss');
    let novi = moment(now, 'YYYY-MM-DD HH:mm:ss').add(15, 'days');
    let petnaestdanakasnije = novi.format('YYYY-MM-DD HH:mm:ss');
    pool.query(`update trgovac set isaktivan=false,vrijeme=$2 where naziv=$1`,
        [req.params.ime, novi])
})
router.post('/admin/blokirajkup/:ime', function (req, res, next) {
    let now = moment(Date.now()).format('YYYY-MM-DD HH:mm:ss');
    let sada = moment(now, 'YYYY-MM-DD HH:mm:ss');
    let novi = moment(now, 'YYYY-MM-DD HH:mm:ss').add(15, 'days');
    let petnaestdanakasnije = novi.format('YYYY-MM-DD HH:mm:ss');
    pool.query(`update kupac set isaktivan=false, vrijeme=$2 where email=$1`,
        [req.params.ime, novi])
})

router.post('/admin/unblokirajtrg/:ime', function (req, res, next) {
    let now = moment(Date.now()).format('YYYY-MM-DD HH:mm:ss');
    let sada = moment(now, 'YYYY-MM-DD HH:mm:ss');
    let novi = moment(now, 'YYYY-MM-DD HH:mm:ss').add(15, 'days');
    let petnaestdanakasnije = novi.format('YYYY-MM-DD HH:mm:ss');
    // console.info(now);
    // console.info(sada); //Moment...
    // console.info(novi);//Moment
    // console.info(petnaestdanakasnije);
    // console.info(sada.isAfter(petnaestdanakasnije));
    // console.info(petnaestdanakasnije.is)
    pool.query(`update trgovac set isaktivan=true, vrijeme=$2 where naziv=$1`,
        [req.params.ime, sada])
})
router.post('/admin/unblokirajkup/:ime', function (req, res, next) {
    let now = moment(Date.now()).format('YYYY-MM-DD HH:mm:ss');
    let sada = moment(now, 'YYYY-MM-DD HH:mm:ss');
    let novi = moment(now, 'YYYY-MM-DD HH:mm:ss').add(15, 'days');
    let petnaestdanakasnije = novi.format('YYYY-MM-DD HH:mm:ss');
    pool.query(`update kupac set isaktivan=true,vrijeme=$2 where email=$1`,
        [req.params.ime, sada])
})
//______________________________________________________________________________//

router.get('/artikal/:id',
    function (req, res, next) {
        pool.query(`select p.slika as slika from ponuda p where p.id=$1`,
            [req.params.id],
            (err, result) => {
                req.slika = result.rows[0].slika;
                console.info(req.slika);
                next();
            })
    }
    , async function (req, res, next) {
        var IDD = parseInt(req.params.id)

        pool.query(`select p.id as idArt,p.naziv as artikal,p.cijena as cijena,p.opis as opis,t.naziv,p.grupa as gr,g.naziv as grupa,p.slika as slika from ponuda p
    inner join grupa g on p.grupa=g.id
    inner join trgovac t on p.trgovac=t.id

    where p.id=$1`,
            [req.params.id],
            async (err, result) => {
                req.ide = result.rows;
                console.info(result.rows)
                await res.render('artikal', {sve: result.rows, slika: req.slika});
            })
    })
router.get('/admin/tabele', pomocne.dajGrupe1, function (req, res, next) {
    let obj = req.cookies.admin;
    if (obj) {
        console.info(req.grupe);
        return res.render('tabele', {gr: req.grupe});
    } else
        return res.redirect('/login');
})
router.post('/admin/dodaj/:gr/:tipp', function (req, res, next) {
    pool.query(`insert into grupa (naziv,tip_grupe) values($1,$2)`,
        [req.params.gr, req.params.tipp]);
})
router.get('/dodajartikal', pomocne.dajGrupe, function (req, res, next) {
    res.render('dodajartikal', {grupe: req.grupe})
})
router.post('/dodajartikal',
    function (req, res, next) {
        pool.query(`select id from grupa where naziv=$1`,
            [req.body.grupa],
            (err, result) => {
                req.kat = result.rows;
                next();
            });
    },
    function (req, res, next) {
        let obj = req.cookies.trgovac;
        obj = JSON.parse(obj);

        pool.query(`insert into ponuda(naziv,trgovac,stanje,grupa,isactive,cijena,opis,slika) values
    ($1,$2,$3,$4,$5,$6,$7,$8) returning id`,
            [req.body.naziv, obj.id, req.body.stanje, req.kat[0].id, true, parseInt(req.body.cijena), req.body.opis, 'nopicture.jpg'],
            (err, result) => {
                req.idPonude = result.rows[0].id
                next();
            })
    }, function (req, res, next) {
        //console.info(req.idPonude)
        let sampleFile;
        let uploadPath;
        let slikaArtikla;
        if (!req.files || Object.keys(req.files).length === 0) {
            pool.query(`update ponuda set slika=$1 where id=$2`,
                ['nopicture.jpg', req.idPonude],
                (err, result) => {
                    next();
                });
        } else {
            sampleFile = req.files.sampleFile;
            let nastavak = "." + sampleFile.mimetype.substring(6);
            slikaArtikla = bcrypt.hashSync(sampleFile.name, 10) + nastavak;
            for (let i = 0; i < slikaArtikla.length; i++) {
                if (slikaArtikla[i] === '/') {
                    slikaArtikla = setCharAt(slikaArtikla, i, 'G');
                }
            }
            uploadPath = __dirname + '/../public/images/' + slikaArtikla;
            sampleFile.mv(uploadPath, function (err) {
                if (err) return res.status(500).send(err);
                pool.query(`update ponuda set slika=$1 where id=$2`,
                    [slikaArtikla, req.idPonude],
                    (err, result) => {
                        next();
                    })
            });
        }
    },
    function (req, res, next) {
        res.redirect('/trgovac')
    }
);
router.get('/profilkupca',
    async function (req, res, next) {
        let obj = req.cookies.kupac;
        obj = JSON.parse(obj);
        pool.query(`select k.slikak as slika from kupac k where id=$1`,
            [obj.id],
            (err, result) => {
                req.slika = result.rows[0].slika;
                console.info(req.slika);
                next();
            })
    }, async function (req, res, next) {
        let obj = req.cookies.kupac;
        obj = JSON.parse(obj);
        console.info(obj);

        pool.query(`select k.ime,k.prezime,k.email from kupac k where id=$1`,
            [obj.id],
            (err, result) => {
                req.kupac = result.rows;
                console.info(req.kupac);
                res.render('profilkupca', {podaci: req.kupac, slika: req.slika})
            })

    })
router.get('/profiltrgovca',
    async function (req, res, next) {
        let obj = req.cookies.trgovac;
        obj = JSON.parse(obj);
        pool.query(`select t.profilna as slika from trgovac t where id=$1`,
            [obj.id],
            (err, result) => {
                req.slika = result.rows[0].slika;
                console.info(req.slika);
                next();
            })
    }, async function (req, res, next) {
        let obj = req.cookies.trgovac;
        obj = JSON.parse(obj);
        console.info(obj);

        pool.query(`select t.naziv,t.telefon,t.email,t.adresa,t.grad from trgovac t where id=$1`,
            [obj.id],
            (err, result) => {
                req.trg = result.rows;
                console.info(req.trg);
                res.render('profiltrgovca', {podaci: req.trg, slika: req.slika})
            })

    })
router.get('/pricaj/chat/:kupac/:trgovac', function (req, res, next) {
    let ajd = req.params.kupac;
    let obj = req.cookies;
    //console.info(ajd);
    let trgovina = req.params.trgovac;
    if (!io) {
        io = require('socket.io')(req.connection.server);

        io.sockets.on('connection', function (client) {
            console.info(client.id);
            client.emit('sve_poruke', poruke.toString());

            if (!prvi_id) {
                prvi_id = client.id;
                console.info(prvi_id);
            }

            client.on('disconnect', function () {
                console.log('disconnected event')
                poruke = [];

            });

            client.on('moja_poruka', function (d) {
                let g = d + "\n";
                console.info(client.id)
                poruke.push(g)
                io.emit('poruka_sa_servera', g)
                //io.to(prvi_id).emit('poruka_sa_servera',g);
            })

        });
    }
    res.render('pricanje')
})
router.post('/naruciartikal/:idart', function (req, res, next) {
    let idArt = req.params.idart;
    let obj = req.cookies.kupac;
    obj = JSON.parse(obj);
    // console.info(obj);
    // console.info(idArt);
    pool.query(`insert into korpa (kupac,artikal) values ($1,$2)`,
        [obj.id, idArt])
})
router.delete('/izbrisiizkorpe/:idArtikla', function (req, res, next) {
    pool.query(`delete from korpa where id=$1`,
        [req.params.idArtikla],
        (err, result) => {
            next();
        })
})

router.get('/uredi/:id', pomocne.dajGrupe, function (req, res, next) {
    var IDD = parseInt(req.params.id);
    pool.query(`select p.id as ajd, p.naziv as artikal,p.cijena as cijena,p.opis as opis,p.grupa as gr,g.naziv as grupa from ponuda p
    inner join grupa g on p.grupa=g.id where p.id=$1`,
        [req.params.id],
        (err, result) => {
            req.ide = result.rows;
            // console.info(result.rows)
            res.render('urediart', {sve: result.rows, grupee: req.grupe});

        })
})
router.post('/uredi',
    function (req, res, next) {
        console.info(req.body.artikal);
        console.info(req.body.kategorija);
        console.info(req.body.cijena);
        console.info(req.body.opis);
        console.info(req.body.ajd);
        console.info(req.files)
        pool.query(`select id from grupa where naziv=$1`,
            [req.body.kategorija],
            (err, result) => {
                req.kat = result.rows;
                console.info(req.kat[0].id)
                next();
            })
    }, function (req, res, next) {

        let sampleFile;
        let uploadPath;
        let slikaArtikla;
        if (!req.files || Object.keys(req.files).length === 0) {
            pool.query(`update ponuda set naziv=$1,grupa=$2,cijena=$3,opis=$4 where id=$5`,
                [req.body.artikal, req.kat[0].id, req.body.cijena, req.body.opis, req.body.ajd],
                (err, result) => {
                    next();
                })
        } else {
            sampleFile = req.files.sampleFile;
            let nastavak = "." + sampleFile.mimetype.substring(6);
            slikaArtikla = bcrypt.hashSync(sampleFile.name, 10) + nastavak;
            for (let i = 0; i < slikaArtikla.length; i++) {
                if (slikaArtikla[i] === '/') {
                    slikaArtikla = setCharAt(slikaArtikla, i, 'G');
                }
            }
            uploadPath = __dirname + '/../public/images/' + slikaArtikla;
            sampleFile.mv(uploadPath, function (err) {
                if (err) return res.status(500).send(err);
                pool.query(`update ponuda set slika=$1,naziv=$2,grupa=$3,cijena=$4,opis=$5 where id=$6`,
                    [slikaArtikla, req.body.artikal, req.kat[0].id, req.body.cijena, req.body.opis, req.body.ajd],
                    (err, result) => {
                        next();
                    })
            });
        }
    }, function (req, res, next) {
        return res.redirect('/trgovac');
    });
router.post('/urediprofiltrgovca',
    function (req, res, next) {
        // console.info(req.body.ime);
        // console.info(req.body.prezime);
        // console.info(req.body.email);
        // console.info(req.body.grad);
        // console.info(req.body.ajd);
        // console.info(req.files)
        let obj = req.cookies.trgovac;
        obj = JSON.parse(obj);
        let sampleFile;
        let uploadPath;
        let slikaArtikla;
        if (!req.files || Object.keys(req.files).length === 0) {
            pool.query(`update trgovac set naziv=$1,telefon=$2,email=$3,adresa=$4,grad=$5 where id=$6`,
                [req.body.naziv, req.body.telefon, req.body.email, req.body.adresa, req.body.grad, obj.id],
                (err, result) => {
                    next();
                })
        } else {
            sampleFile = req.files.sampleFile;
            let nastavak = "." + sampleFile.mimetype.substring(6);
            slikaArtikla = bcrypt.hashSync(sampleFile.name, 10) + nastavak;
            for (let i = 0; i < slikaArtikla.length; i++) {
                if (slikaArtikla[i] === '/') {
                    slikaArtikla = setCharAt(slikaArtikla, i, 'G');
                }
            }
            uploadPath = __dirname + '/../public/images/' + slikaArtikla;
            sampleFile.mv(uploadPath, function (err) {
                if (err) return res.status(500).send(err);
                pool.query(`update trgovac set naziv=$1,telefon=$2,email=$3,adresa=$4,grad=$5,profilna=$6 where id=$7`,
                    [req.body.naziv, req.body.telefon, req.body.email, req.body.adresa, req.body.grad, slikaArtikla, obj.id],
                    (err, result) => {
                        next();
                    })
            });
        }
    }, function (req, res, next) {
        return res.redirect('/profiltrgovca');
    });
router.post('/urediprofilkupca',
    function (req, res, next) {
        // console.info(req.body.ime);
        // console.info(req.body.prezime);
        // console.info(req.body.email);
        // console.info(req.body.opis);
        // console.info(req.body.ajd);
        // console.info(req.files)
        let obj = req.cookies.kupac;
        obj = JSON.parse(obj);
        let sampleFile;
        let uploadPath;
        let slikaArtikla;
        if (!req.files || Object.keys(req.files).length === 0) {
            pool.query(`update kupac set ime=$1,prezime=$2,email=$3 where id=$4`,
                [req.body.ime, req.body.prezime, req.body.email, obj.id],
                (err, result) => {
                    next();
                })
        } else {
            sampleFile = req.files.sampleFile;
            let nastavak = "." + sampleFile.mimetype.substring(6);
            slikaArtikla = bcrypt.hashSync(sampleFile.name, 10) + nastavak;
            for (let i = 0; i < slikaArtikla.length; i++) {
                if (slikaArtikla[i] === '/') {
                    slikaArtikla = setCharAt(slikaArtikla, i, 'G');
                }
            }
            uploadPath = __dirname + '/../public/images/' + slikaArtikla;
            sampleFile.mv(uploadPath, function (err) {
                if (err) return res.status(500).send(err);
                pool.query(`update kupac set ime=$1,prezime=$2,email=$3,slikak=$4 where id=$5`,
                    [req.body.ime, req.body.prezime, req.body.email, slikaArtikla, obj.id],
                    (err, result) => {
                        next();
                    })
            });
        }
    }, function (req, res, next) {
        return res.redirect('/profilkupca');
    });
router.post('/pretraga', function (req, res, next) {
    pool.query(`select p.naziv as artikal,p.*,g.naziv as grupa from ponuda p
    inner join grupa g on p.grupa=g.id
    where lower(p.naziv) like lower('%${req.body.trazi}%')
    or lower(g.naziv) like lower('%${req.body.trazi}%')`,
        (err, result) => {
            req.rezulat = result.rows;
            console.info(req.rezulat)
            next();
        })
}, function (req, res, next) {
    pool.query(`select * from trgovac t
    where lower(t.naziv) like lower('%${req.body.trazi}%')`,
        (err, result) => {
            req.reztrgovca = result.rows;
            next();
        })
}, function (req, res, next) {
    pool.query(`select * from tip_artikla ta
    where lower(ta.naziv) like lower('%${req.body.trazi}%')`,
        (err, result) => {
            req.tipartikla = result.rows;
            next();
        })
}, function (req, res, next) {
    return res.render('pretraga1', {stvari: req.rezulat, ljudi: req.reztrgovca, tip: req.tipartikla})
})
router.get('/tipartikla/Roba', function (req, res, next) {
    pool.query(`select p.naziv as artikal,p.opis as opis, p.cijena as cijena,p.id as artid,p.slika from ponuda p
    inner join grupa g on p.grupa = g.id
    inner join tip_artikla ta on g.tip_grupe = ta.id
    where ta.naziv = 'Roba'`,
        (err, result) => {
            req.svaRoba = result.rows;
            console.info(result.rows)
            res.render('artikliRoba', {roba: req.svaRoba})
        })
})

router.get('/tipartikla/Usluga', function (req, res, next) {
    pool.query(`select p.naziv as artikal,p.opis as opis, p.cijena as cijena,p.id as artid,p.slika from ponuda p
    inner join grupa g on p.grupa = g.id
    inner join tip_artikla ta on g.tip_grupe = ta.id
    where ta.naziv = 'Usluga'`,
        (err, result) => {
            req.sveUsluge = result.rows;
            res.render('artikliUsluge', {usluga: req.sveUsluge})
        })
})
//Naruci
router.post('/kupac/profil/naruci', function (req, res, next) {
    let obj = JSON.parse(req.cookies.kupac);
    pool.query(`update korpa set status='narucen' where korpa.kupac=$1`,
        [obj.id],
        (err, result) => {
            next();
        })
}, function (req, res, next) {
    res.redirect('/kupac')
})
//Otkazi narudzbu
router.post('/kupac/narudzba/otkazi', function (req, res, next) {
    //console.info(req.body.ajd);
    let x = req.body.ajd;
    pool.query(`delete from korpa where id=${x}`,
        (err, result) => {
            next();
        })
}, function (req, res, next) {
    res.redirect('/kupac/profil/narudzbe');
})
router.post('/trgovac/narudzba/isporucena', function (req, res, next) {
    //console.info(req.body);
    let x = req.body.stat;
    let z = 'isporucen'
    pool.query(`update korpa set status='isporucen' where korpa.id=$1`,
        [x],
        (err, result) => {
            next();
        })
}, function (req, res, next) {
    res.redirect('/trgovac/profiltrgovca/naruceni')
})
router.post('/trgovac/narudzba/odbijena', function (req, res, next) {
    //console.info(req.body);
    let x = req.body.stat;
    let z = 'isporucen'
    pool.query(`update korpa set status='odbijen' where korpa.id=$1`,
        [x],
        (err, result) => {
            next();
        })
}, function (req, res, next) {
    res.redirect('/trgovac/profiltrgovca/naruceni')
})

router.get('/logoutkupca', function (req, res, next) {
    res.clearCookie('kupac');
    next();
}, function (req, res, next) {
    res.redirect('/login')
})
router.get('/logouttrgovca', function (req, res, next) {
    res.clearCookie('trgovac');
    next();
}, function (req, res, next) {
    res.redirect('/login')
})


function validUser(user) {
    const validEmail = typeof user.email == 'string' && user.email.trim() !== '';
    const validPassword = typeof user.password == 'string' && user.password.trim() !== '';
    const validNaziv = typeof user.naziv == 'string' && user.naziv.trim() !== '';
    const validTelefon = typeof user.telefon == 'string' && user.telefon.trim() !== '';
    const validAdresa = typeof user.adresa == 'string' && user.adresa.trim() !== '';


    return validEmail && validPassword && validNaziv && validTelefon;

}

function validUser1(user) {
    const validEmail = typeof user.email == 'string' && user.email.trim() !== '';
    const validPassword = typeof user.password == 'string' && user.password.trim() !== '';
    const validIme = typeof user.ime == 'string' && user.ime.trim() !== '';
    const validPrezime = typeof user.prezime == 'string' && user.prezime.trim() !== '';

    return validEmail && validPassword && validIme && validPrezime;

}

module.exports = pomocne;
module.exports = router;
