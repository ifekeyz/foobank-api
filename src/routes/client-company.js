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
const { transporter } = require('../config/config');


const {CloudinaryStorage} = require('multer-storage-cloudinary')
const cloudinary = require('cloudinary').v2
const dotenv = require('dotenv')


dotenv.config()

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_KEY,
    api_secret: process.env.CLOUDINARY_SECRET
});

const storage = new CloudinaryStorage({
    cloudinary,
    params: {
        folder: 'foodBank',
        // allowedFormats: ['pdf', 'docx', 'doc', 'txt']
    }
});
const upload = multer({ storage: storage });

module.exports = {
    cloudinary,
    storage
}



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
            from: 'no-reply@sovereigntechltd.com',
            to: req.body.companyEmail,
            subject: 'OTP-Request',
            html: `
            <main>
            <div style="background-color: #f4f4f4; text-align: center; width: 100%;">
                <img style="width: 70px; padding: 15px;" src="https://sovereigntechltd.com/Frame%2028%20_1_.png" alt="logo">
            </div>
            <h2>Hello,</h2>
            <p>You can complete your 
                <span style="background-color: #008B50; padding: 3px; border-radius: 2px; color: white;">FoodBankApp</span> registration with the OTP below.
            </p>
            <div style="text-align: center; ">
                <h1>
                <span style="color: #008B50; text-align: center;">One Time Password (OTP)</span>
                </h1>
                </div>
                <div style='text-align: center;  '>
                    <h1 style="background-color: #f4f4f4; padding: 8px; text-align: center; border-radius: 5px; margin: 0 50px  ">${verificationCode}</h1>
            </div>
            <p>This code expires in 5 minutes. Do not click any links or share with any body.</p>
            <p>If you didn't attempt to register, please contact us at info@sovereigntechltd.com.</p>
                <p>©️ 2023 Sovereigntechltd. All rights reserved.</p>
            </main>
            `
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


router.put('/:companyId', upload.single('image'), async (req, res) => {
    try {
        const { companyId } = req.params;
        const { staffStrength, address, companyPhone, industryType, companyPayBackDay } = req.body;
        const file = req.file;
        if (!file) { return res.status(400).send("No image in the request") }
        const fileName = req.file.path

        const user = await ClientCompany.findById(companyId);

        if (!user) {
            return res.status(404).json({ message: "Company with ID not found" });
        }
        user.staffStrength = staffStrength || '';
        user.address = address || '';
        user.companyPhone = companyPhone || '';
        user.industryType = industryType || '';
        user.companyLogo = fileName || '';
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
            { expiresIn: '1d' }
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

router.get('/registeredStaff/:companyName/:userId', async (req, res) => {
    try {
        const{ companyName,userId }= req.params;

        // Find staff members of the specified company
        const companyStaff = await User.find({ company: companyName, isMember: true,_id:userId },{ passwordHash: 0 } );

        if (companyStaff.length === 0) {
            return res.status(404).json({message: 'Either company name or user Id is not valid'});
        }


        res.status(200).json(companyStaff);
    } catch (error) {
        console.error('Error retrieving company staff:', error);
        res.status(500).json({ message: 'Error', error: error.message });
    }
})


router.post('/send-verification-code', async (req, res) => {
    const { email } = req.body;

    // Generate a 4-digit verification code
    const verificationCode = Math.floor(1000 + Math.random() * 9000).toString();
    const userEmail = await ClientCompany.findOne({companyEmail: email });
    if (!userEmail) {
        res.status(400).json({ error: 'Invalid email address' });
        return;
    }

    // Email content
    const mailOptions = {
        from: 'no-reply@sovereigntechltd.com',
        to: email,
        subject: 'FoodLoanBank OTP Code',
        html: `
            <main>
            <div style="background-color: #f4f4f4; text-align: center; width: 100%;">
                <img style="width: 70px; padding: 15px;" src="https://sovereigntechltd.com/Frame%2028%20_1_.png" alt="logo">
            </div>
            <h2>Hello,</h2>
            <p>You can complete your 
                <span style="background-color: #008B50; padding: 3px; border-radius: 2px; color: white;">FoodBankApp</span> registration with the OTP below.
            </p>
            <div style="text-align: center; ">
                <h1>
                <span style="color: #008B50; text-align: center;">One Time Password (OTP)</span>
                </h1>
                </div>
                <div style='text-align: center;  '>
                    <h1 style="background-color: #f4f4f4; padding: 8px; text-align: center; border-radius: 5px; margin: 0 50px  ">${verificationCode}</h1>
            </div>
            <p>This code expires in 5 minutes. Do not click any links or share with any body.</p>
            <p>If you didn't attempt to register, please contact us at info@sovereigntechltd.com.</p>
                <p>©️ 2023 Sovereigntechltd. All rights reserved.</p>
            </main>
            `
    };

    try {
        // Send the email
        await transporter.sendMail(mailOptions);

        // Update the user with the verification code
        const user = await ClientCompany.findOneAndUpdate(
            {companyEmail: email},
            {verificationCode:verificationCode },
            { new: true }
        );

        if (!user) {
            res.status(400).json({ error: 'User not found' });
            return;
        }

        res.status(200).json({ message: 'Verification code sent successfully', id: user._id });
    } catch (error) {
        console.error('Error sending verification code:', error);
        res.status(500).json({ error: `Failed to send verification code ${error}` });
    }
});




router.put('/change/password/:id', async (req, res) => {
    const userExist = await ClientCompany.findById(req.params.id);

    let newPassword
    if (req.body.password) {
        newPassword = bcrypt.hashSync(req.body.password, 10)
    }
    else {
        newPassword = userExist.passwordHash;

    }
    const user = await ClientCompany.findByIdAndUpdate(
        req.params.id,
        {
            companyEmail: req.body.email,
            passwordHash: bcrypt.hashSync(req.body.password, 10)
        },
        { new: true }
    )
    if (!user) {
        return res.status(400).send("The user cannot be created! ")
    }
    res.send(user);
});

router.put('/approveStaff/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const user = await User.findById(id);

        if (!user) {
            return res.status(400).json({ message: 'user not found' });
        }
        if (user.companyApprove == 'pending') {

            user.companyApprove = 'approved';
            await user.save();
            // Email content
            const mailOptions = {
                from: 'no-reply@sovereigntechltd.com',
                to: 'sovereigntechnology01@gmail.com',
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
            return res.status(400).json({ message: 'User has already been approved' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Error', error: error.message });
    }
})

router.put('/declineStaff/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const user = await User.findById(id);

        if (!user) {
            return res.status(400).json({ message: 'user not found' });
        }
        if (user.companyApprove == 'pending') {

            user.companyApprove = 'declined';
            await user.save();
            // Email content
            const mailOptions = {
                from: 'no-reply@sovereigntechltd.com',
                to: 'sovereigntechnology01@gmail.com',
                subject: `${user.company} Disapprove`,
                html: `Hi <p>${user.fullname}, of user identity of ${user.id}</p>
                <p>Has not been approved by us.</p>
                <p>We want you to know that the aim of this is to simplify the burden, and we have got this right with you.</p>
                <p>Regards,</p>
                <p>Team ${user.company}.</p>`
            };

            await transporter.sendMail(mailOptions);

            return res.status(200).json({ message: 'User disapproved successfully' });
        } else {
            return res.status(400).json({ message: 'User has already been disapproved' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Error', error: error.message });
    }
});

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
        const companyStaff = await User.find({ company: companyName});

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

router.post('/companyPayment/:companyName', upload.single('image'), async (req, res) => {
    try {
        const companyName = req.params.companyName;
        const amountPaid = req.body.amountPaid;

        const file = req.file;
        if (!file) { return res.status(400).send("No image in the request") }
        const fileName = req.file.path;

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
            transactionReceipt: fileName
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
        const payment = await Payment.find({ companyName: companyName });

        if (!payment) {
            return res.status(404).json({ message: 'payment not found' });
        }
        res.json(payment);
    } catch (error) {
        res.status(500).json({ message: 'Error', error: error.message });

    }
})





module.exports = router;
