const { User } = require('../models/user');
const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const multer = require('multer');
const ClientCompany = require('../models/clientCompany');
const Wallet = require('../models/wallet');
const Order = require('../models/order')
const Payment = require('../models/payment')

const FILE_TYPE_MAP = {
    'image/png': 'png',
    'image/jpeg': 'jpeg',
    'image/jpg': 'jpg'
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const isValid = FILE_TYPE_MAP[file.mimetype];
        let uploadError = new Error('invalid image type');

        if (isValid) {
            uploadError = null
        }
        cb(uploadError, 'public/uploads')
    },
    filename: function (req, file, cb) {
        const fileName = file.originalname.split(' ').join('-');
        const extension = FILE_TYPE_MAP[file.mimetype];
        cb(null, `${fileName}-${Date.now()}.${extension}`)
    }
})
const uploadOptions = multer({ storage: storage })


const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true, // Use SSL
    auth: {
        user: 'sovereigntechnology01@gmail.com',
        pass: 'rqjcpfdszavqbpby'
    }
});

router.get('/', async (req, res) => {
    try {
        const userList = await ClientCompany.find().select('-passwordHash');
        res.json(userList);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});



router.get('/:id', async (req, res) => {
    const user = await ClientCompany.findById(req.params.id).select('-passwordHash');
    if (!user) {
        res.status(500).json({ message: "The user with the given ID was not found" });
    }
    res.json(user);
});

router.post('/', async (req, res) => {
    try {
        const companyEmail = req.body.companyEmail

        const user = await ClientCompany.findOne({ companyEmail });
        if (user) {
            return res.status(500).json({ message: "Oops! Provided email already exists. Please use another email address." });
        }

        const verificationCode = Math.floor(1000 + Math.random() * 9000).toString();

        const newUser = new ClientCompany({
            companyName: req.body.companyName,
            companyEmail: companyEmail,
            passwordHash: bcrypt.hashSync(req.body.password, 10),
            verificationCode: verificationCode,
        });

        await newUser.save();

        // Email content
        const mailOptions = {
            from: 'sovereigntechnology01@gmail.com',
            to: req.body.companyEmail,
            subject: 'OTP-Request',
            text: `Your verification code for FoodBankApp Registration is : ${verificationCode}`,
        };

        await transporter.sendMail(mailOptions);

        res.status(200).json({ message: 'Verification code sent successfully', newUser });
    } catch (error) {
        console.error('Error creating user and sending verification code:', error);
        res.status(500).json({ error: 'Failed to create user and send verification code' });
    }
});


router.post('/verify-code', async (req, res) => {
    const { companyEmail, code } = req.body;

    try {

        const user = await ClientCompany.findOne({ companyEmail });

        if (!user || user.verificationCode !== code) {
            res.status(400).json({ error: 'Invalid verification code or company Email address' });
            return;
        }

        user.verificationCode = '';
        await user.save();

        res.status(200).json({ message: 'Verification successful', user });
    } catch (error) {
        console.error('Error verifying verification code:', error);
        res.status(500).json({ error: 'Failed to verify verification code' });
    }
});


router.put('/:companyId', uploadOptions.single('image'), async (req, res) => {
    try {
        const { companyId } = req.params;
        const { staffStrength, address, companyPhone, industryType, companyPayBackDay } = req.body;
        const file = req.file;
        if (!file) { return res.status(400).send("No image in the request") }
        const fileName = req.file.filename
        const basepath = `${req.protocol}://${req.get('host')}/public/uploads/`;

        const user = await ClientCompany.findById(companyId);

        if (!user) {
            return res.status(404).json({ message: "Company with ID not found" });
        }
        user.staffStrength = staffStrength || '';
        user.address = address || '';
        user.companyPhone = companyPhone || '';
        user.industryType = industryType || '';
        user.companyLogo = `${basepath}${fileName}` || '';
        user.companyPayBackDay = companyPayBackDay || '';
        user.isApproved = true


        await user.save();
        res.status(200).json({ message: 'Company Registration issuccessfully', user });
    } catch (e) {
        console.log("Registration Completion Error", e)
        res.status(500).json({ message: 'An error occurred during registration completion' });
    }
});


router.post('/login', async (req, res) => {
    const user = await ClientCompany.findOne({ companyEmail: req.body.companyEmail })
    const secret = process.env.secret;

    if (!user) {
        return res.status(400).send(`The company with email not found`);
    }
    if (user && bcrypt.compareSync(req.body.password, user.passwordHash)) {
        const token = jwt.sign(
            {
                userId: user._id,
                isAdmin: user.isApproved
            },
            secret,
            { expiresIn: '5m' }
        )
        res.status(200).send({ user, token: token })
    }
    else {
        res.status(400).send('Opps! Password is wrong')
    }
});


router.get('/statistic/:companyName', async (req, res) => {
    try {
        const companyName = req.params.companyName;

        // Find staff members of the specified company
        const companyStaff = await User.find({ company: companyName });

        if (companyStaff.length === 0) {
            return res.status(201).json({ totalCompanyStaff: '0', totalLoan: '0:00', monthlyTotalLoan: '0.00', totalPaidLoan: '0.00' });
        }
        const totalCompanyStaff = companyStaff.length

        let totalLoan = 0;
        for (const user of companyStaff) {
            const wallet = await Wallet.findOne({ userId: user._id });
            if (wallet) {
                totalLoan += wallet.totalLoan;
            }
        }

        const monthlyTotalLoan = totalLoan / 3

        let totalPaidLoan = 0;
        for (const user of companyStaff) {
            const wallet = await Wallet.findOne({ userId: user._id });
            if (wallet) {
                totalPaidLoan += wallet.paidLoan;
            }
        }

        res.status(200).json({ totalCompanyStaff, totalLoan, monthlyTotalLoan, totalPaidLoan });
    } catch (error) {
        console.error('Error retrieving company staff:', error);
        res.status(500).json({ message: 'Error', error: error.message });
    }
})


router.get('/registeredStaff/:companyName', async (req, res) => {
    try {
        const companyName = req.params.companyName;

        // Find staff members of the specified company
        const companyStaff = await User.find({ company: companyName, isMember: true });

        if (companyStaff.length === 0) {
            return res.status(201).json([]);
        }


        res.status(200).json(companyStaff);
    } catch (error) {
        console.error('Error retrieving company staff:', error);
        res.status(500).json({ message: 'Error', error: error.message });
    }
})

router.put('/approveStaff/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const user = await User.findById(id);

        if (!user) {
            return res.status(400).json({ message: 'user not found' });
        }
        if (user.companyApprove == false) {

            user.companyApprove = true;
            await user.save();
            // Email content
            const mailOptions = {
                from: user.email,
                to: 'info@foodbank-app.com.ng',
                subject: `${user.company} Approval`,
                html: `Hi <p>${user.fullname}, of user identity of ${user.id}</p>
                <p>Has been approved by us.</p>
                <p>We want you to know that the aim of this is to simplify the burden, and we have got this right with you.</p>
                <p>Regards,</p>
                <p>Team ${user.company}.</p>`
            };

            await transporter.sendMail(mailOptions);

            return res.status(200).json({ message: 'User approved successfully' });
        } else {
            return res.status(400).json({ message: 'User cannot be accepted in its current state' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Error', error: error.message });
    }
})

router.get('/loanTransaction/:companyName', async (req, res) => {
    try {
        const companyName = req.params.companyName;
        const companyStaff = await User.find({ company: companyName, companyApprove: true });

        if (!companyStaff) {
            return res.status(201).json([]);
        }

        let staffLoan = [];
        let payback = 0;
        let monthlyPayBack = 0;
        for (const user of companyStaff) {
            const wallet = await Wallet.findOne({ userId: user._id });
            if (wallet) {
                staffLoan.push({ userId: user.id, fullname: user.fullname, email: user.email, staffId: user.staffId, wallet: wallet });
                payback += wallet.currentLoan || 0;

                monthlyPayBack = payback / 3
            }
        }

        return res.status(200).json({ monthlyPayBack, staffLoan });
    } catch (error) {
        res.status(500).json({ message: 'Error', error: error.message });
    }
});


router.get('/staffRequestHistory/:companyName', async (req, res) => {
    try {
        const companyName = req.params.companyName;
        const companyStaff = await User.find({ company: companyName, companyApprove: true });

        if (!companyStaff) {
            return res.status(201).json([]);
        }

        let staffShoppingHistory = [];
        for (const user of companyStaff) {
            const shoppingHistory = await Order.find({ status: 'approved', userId: user._id })
                .populate({
                    path: 'orderItems',
                    select: 'name measurement type quantity totalPrice',
                })
                .select('_id status orderDate allItemsTotalPrice userFullname orderNumber userId') // Select additional fields if needed
                .sort('-orderDate'); // Sort orders by orderDate in descending order

            if (shoppingHistory.length > 0) {
                staffShoppingHistory.push({ user, shoppingHistory });

            }
        }

        return res.status(200).json({ staffShoppingHistory });
    } catch (error) {
        res.status(500).json({ message: 'Error', error: error.message });
    }
});

router.post('/companyPayment/:companyName', uploadOptions.single('image'), async (req, res) => {
    try {
        const companyName = req.params.companyName;
        const amountPaid  = req.body.amountPaid;

        const file = req.file;
        if (!file) { return res.status(400).send("No image in the request") }
        const fileName = req.file.filename
        const basepath = `${req.protocol}://${req.get('host')}/public/uploads/`;

        const companyStaff = await ClientCompany.find({ companyName: companyName });

        if (companyStaff.length === 0) {
            return res.status(401).json({ message: "Opps! no staffs with your company name" });
        }

        // Set month and year to current month and year
        const currentDate = new Date();
        const currentMonth = currentDate.toLocaleString('default', { month: 'long' });
        const currentYear = currentDate.getFullYear();

        const newPayment = new Payment({
            amountPaid: amountPaid,
            companyName: companyName,
            month: currentMonth,
            year: currentYear,
            transactionReceipt: `${basepath}${fileName}`
        })
        const savePayment = await newPayment.save();

        res.status(200).json(savePayment);
    } catch (error) {
        
        res.status(500).json({ message: 'Error', error: error.message });
    }
})

router.get('/companyPayment/:companyName', async (req, res) => {
    try {
        const companyName = req.params.companyName;
        const payment = await Payment.find({companyName:companyName});

        if (!payment) {
            return res.status(404).json({ message: 'payment not found' });
        }
        res.json(payment);
    } catch (error) {
        res.status(500).json({ message: 'Error', error: error.message });

    }
})


module.exports = router;