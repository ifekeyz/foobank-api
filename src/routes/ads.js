const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');
const Ads = require('../models/ads');
const { transporter } = require('../config/config');



router.post('/ads-details', async (req, res) => {
    const name = req.body.name
    const email = req.body.email

    const adsEmail = await Ads.findOne({ email });

    if (adsEmail) {
        return res.status(400).json({ error: 'Email already subscribed. Thanks' });
    }
    // Email content
    const mailOptions = {
        from: 'no-reply@sovereigntechltd.com',
        to: email,
        subject: 'Welcome to Foodbank - Your Solution for Food Loans    ',
        html: `
            <main>
                <div style="background-color: #f4f4f4; text-align: center; width: 100%;">
                    <img style="width: 70px; padding: 15px;" src="https://sovereigntechltd.com/Frame%2028%20_1_.png" alt="logo">
                </div>
                
                <h2>Hello ${name}!</h2>
                <p>Welcome Aboard: Your Journey With Foodbank Starts Here!</p>
                <p>
                We're thrilled to welcome you to Foodbank - the trustworthy solution to your mealtime needs. 
                We understand that getting a nutritious meal can be a challenge due to time constraints and unexpected expenses, 
                and that's why we're here.
                </p>
                <p>
                With Foodbank, you can order food now and pay later, ensuring you never have to skip a meal.
                </p>
                <p>Our app is user-friendly and designed for convenience. Why not take a moment now to order your first meal? 
                We're confident you'll find it a breeze to use.
                </p>
                <p>[Order your first meal now]</p>
            </main>
        `,
    };

    
    const adminMailOptions = {
        from: 'no-reply@sovereigntechltd.com',
        to: 'macaulay@sovereigntechltd.com', 
        subject: 'New Ad Created on Foodbank',
        html: `
            <main>
                <h2>New Ad Created!</h2>
                <p>Name: ${name}</p>
                <p>Email: ${email}</p>
                <p>Company Name: ${req.body.companyName}</p>
            </main>
        `,
    };

    try {
        // Send the email
        await transporter.sendMail(mailOptions);
        await transporter.sendMail(adminMailOptions);
        const newAds = new Ads({
            name: req.body.name,
            email: req.body.email,
            companyName: req.body.companyName
        });


        if (!newAds) {
            return res.status(400).json({ error: 'Error creating the ads' });
        }
        await newAds.save();

        res.status(200).json({ message: 'Ads created successfully' });

    } catch (error) {
        res.status(500).json({ error: `Failed to create ads!!!` });
    }
})


module.exports = router;