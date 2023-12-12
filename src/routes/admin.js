const { User } = require('../models/user');
const Company = require('../models/company');
const Staff = require('../models/staff');
const Order = require('../models/order');
const express = require('express');
const adminController = require('../controllers/Admin');
const Faq = require('../models/faq');
const Enquire = require('../models/contact');
const Wallet = require('../models/wallet');
// const { transporter } = require('../helpers/util');
const AdminVat = require('../models/admin');
const { flutterwavePublicKey } = require('../config/config');
const ClientCompany = require('../models/clientCompany');
const Payment = require('../models/payment')
const router = express.Router();
const { transporter } = require('../config/config');


router.post('/createAdmin', adminController.createAdmin);
router.post('/getCompanyCount', adminController.getCompanyCount);
router.post('/getStaffCount', adminController.getStaffCount);


router.get('/getOrderRequest', async (req, res) => {
    try {
        // Retrieve all orders
        const orders = await Order.find();

        res.status(200).json({ orders });
    } catch (error) {
        console.error('Error retrieving orders:', error);
        res.status(500).json({ message: 'Error', error: error.message });
    }
});

router.put('/approve/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const order = await Order.findById(id);

        if (!order) {
            return res.status(400).json({ message: 'Order not found' });
        }
        const userId = order.userId
        const allItemsTotalPrice = order.allItemsTotalPrice

        const wallet = await Wallet.findOne({ userId });

        if (!wallet) {
            return res.status(400).json({ message: 'User wallet not found on order' });
        }
        else {
            if (wallet.totalLoan === wallet.currentLoan) {
                wallet.balance -= allItemsTotalPrice
                wallet.totalLoan += allItemsTotalPrice
                currentAmountLeft = wallet.paidLoan
                wallet.currentLoan += allItemsTotalPrice
                currentLoanData = wallet.currentLoan
                wallet.montlyPayBack = currentLoanData / 3

                // await wallet.save();

                const orders = await Order.find({ userId });

                if (!orders || orders.length === 0) {
                    return res.status(404).json({ message: 'No orders found for the user' });
                }

                // Calculate the sum of allItemsTotalPrice across all orders
                // const totalAllItemsTotalPrice = orders.reduce((total, order) => total + order.allItemsTotalPrice, 0);
                // wallet.totalLoan += totalAllItemsTotalPrice

                const userInfo = await User.findOne({ _id: userId })

                const email = userInfo.email
                // Check if the order is in a state where it can be accepted
                if (order.status === 'pending') {
                    // Update the order status to 'approved' or 'accepted'
                    order.status = 'approved';
                    const randomOrderNumber = Math.floor(100000 + Math.random() * 900000);
                    order.orderNumber = `#${randomOrderNumber}`;

                    // Email content
                    const mailOptions = {
                        from: 'no-reply@sovereigntechltd.com',
                        to: email,
                        subject: 'Order Approved',
                        html: `
                        <main>
                            <div style="background-color: #f4f4f4; text-align: center; width: 100%;">
                                <img style="width: 70px; padding: 15px;" src="https://sovereigntechltd.com/Frame%2028%20_1_.png" alt="logo">
                            </div>
                            <h2>Hello ${userInfo.fullname},</h2>
                            <p>Your Order with order number
                                <span style="background-color: #008B50; padding: 3px; border-radius: 2px; color: white;">${order.orderNumber}</span> has been approved.
                            </p>
                            
                            <p>Kindly, be on a look for a delivery.</p>
                            <p>If you didn't attempt to register, please contact us at info@sovereigntechltd.com.</p>
                                <p>©️ 2023 Sovereigntechltd. All rights reserved.</p>
                        </main>
                        `
                    };

                    // await transporter.sendMail(mailOptions);
                    await wallet.save();
                    await order.save();

                    return res.status(200).json({ message: 'Order accepted successfully' });
                } else {
                    return res.status(400).json({ message: 'Order cannot be accepted in its current state' });
                }
            } else if( wallet.currentLoan != wallet.totalLoan) {
                wallet.balance -= allItemsTotalPrice
                wallet.totalLoan += allItemsTotalPrice
                currentAmountLeft = wallet.currentLoan - wallet.paidLoan
                wallet.currentLoan = allItemsTotalPrice + currentAmountLeft
                currentLoanData = wallet.currentLoan
                wallet.montlyPayBack = currentLoanData / 3
                wallet.paidLoan = 0

                // await wallet.save();

                const orders = await Order.find({ userId });

                if (!orders || orders.length === 0) {
                    return res.status(404).json({ message: 'No orders found for the user' });
                }

                // Calculate the sum of allItemsTotalPrice across all orders
                // const totalAllItemsTotalPrice = orders.reduce((total, order) => total + order.allItemsTotalPrice, 0);
                // wallet.totalLoan += totalAllItemsTotalPrice

                const userInfo = await User.findOne({ _id: userId })

                const email = userInfo.email
                // Check if the order is in a state where it can be accepted
                if (order.status === 'pending') {
                    // Update the order status to 'approved' or 'accepted'
                    order.status = 'approved';
                    const randomOrderNumber = Math.floor(100000 + Math.random() * 900000);
                    order.orderNumber = `#${randomOrderNumber}`;

                    // Email content
                    const mailOptions = {
                        from: 'no-reply@sovereigntechltd.com',
                        to: email,
                        subject: 'Order Approved',
                        html: `
                        <main>
                            <div style="background-color: #f4f4f4; text-align: center; width: 100%;">
                                <img style="width: 70px; padding: 15px;" src="https://sovereigntechltd.com/Frame%2028%20_1_.png" alt="logo">
                            </div>
                            <h2>Hello ${userInfo.fullname},</h2>
                            <p>Your Order with order number
                                <span style="background-color: #008B50; padding: 3px; border-radius: 2px; color: white;">${order.orderNumber}</span> has been approved.
                            </p>
                            
                            <p>Kindly, be on a look for a delivery.</p>
                            <p>If you didn't attempt to register, please contact us at info@sovereigntechltd.com.</p>
                                <p>©️ 2023 Sovereigntechltd. All rights reserved.</p>
                        </main>
                        `
                    };

                    await transporter.sendMail(mailOptions);
                    await wallet.save();
                    await order.save();

                    return res.status(200).json({ message: 'Order accepted successfully' });
                } else {
                    return res.status(400).json({ message: 'Order cannot be accepted in its current state' });
                }
            }
        }
    } catch (error) {
        res.status(500).json({ message: 'Error', error: error.message });
    }
});


router.put('/decline/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const order = await Order.findById(id);

        if (!order) {
            return res.status(400).json({ message: 'Order not found' });
        }

        // Check if the order is in a state where it can be accepted
        if (order.status === 'pending') {
            // Update the order status to 'approved' or 'accepted'
            order.status = 'declined';
            await order.save();

            return res.status(200).json({ message: 'Order declined successfully' });
        } else {
            return res.status(400).json({ message: 'Order cannot be declined in its current state' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Error', error: error.message });
    }
});


router.post('/createFaq', async (req, res) => {
    const { title, content } = req.body
    try {
        const newFaq = new Faq({
            title,
            content
        })
        const saveFaq = await newFaq.save();


        res.status(200).json(saveFaq);

    } catch (error) {
        return res.status(500).json({ message: 'Error', error: error.message })
    }
})

router.get('/getFaqs', async (req, res) => {
    try {
        // Retrieve all orders
        const faqs = await Faq.find();

        res.status(200).json({ faqs });
    } catch (error) {
        console.error('Error retrieving faqs:', error);
        res.status(500).json({ message: 'Error', error: error.message });
    }
})

router.post('/createComplaint', async (req, res) => {
    const { firstname, lastname, email, complaint } = req.body
    try {
        const newEnquire = new Enquire({
            firstname,
            lastname,
            email,
            complaint
        })
        const saveEnquire = await newEnquire.save();


        res.status(200).json(saveEnquire);

    } catch (error) {
        return res.status(500).json({ message: 'Error', error: error.message })
    }
})

router.get('/getComplaint', async (req, res) => {
    try {
        // Retrieve all orders
        const enquire = await Enquire.find();

        res.status(200).json(enquire);
    } catch (error) {
        console.error('Error retrieving faqs:', error);
        res.status(500).json({ message: 'Error', error: error.message });
    }
})

router.post('/createCompany', async (req, res) => {
    try {
        const { companyName, companyEmail, staffStrength, location } = req.body;

        const randomNumber = Math.floor(100000 + Math.random() * 900000);
        const companyId = `#${randomNumber}`;

        // Create a new company document
        const newCompany = new Company({
            companyName,
            companyEmail,
            companyId,
            staffStrength,
            location,
        });

        // Save the new company to the database
        const savedCompany = await newCompany.save();

        // Return the saved company as a JSON response
        res.status(200).json(savedCompany);
    } catch (error) {
        res.status(500).json({ message: 'Error', error: error.message });
    }
})


router.get('/getAllCompany', async (req, res) => {
    try {
        // Retrieve all companies
        const company = await ClientCompany.find();

        res.status(200).json(company);
    } catch (error) {
        console.error('Error retrieving companies:', error);
        res.status(500).json({ message: 'Error', error: error.message });
    }
})


router.post('/createCompanyStaff', async (req, res) => {
    try {
        const { fullName, email, company, salary } = req.body;

        // Check if a staff with the same email already exists
        const existingStaff = await Staff.findOne({ email });

        if (existingStaff) {
            // If staff with the same email exists, return a 409 Conflict status
            return res.status(404).json({ message: 'Staff with this email already exists.' });
        }
        const randomNumber = Math.floor(100000 + Math.random() * 900000);
        clientId = `#${randomNumber}`;

        // Create a new staff member
        const newStaff = new Staff({
            fullName,
            clientId,
            email,
            company,
            salary,
        });

        // Save the new staff member to the database
        const savedStaff = await newStaff.save();

        // Return the saved staff member with a 201 Created status
        return res.status(200).json(savedStaff);
    } catch (error) {
        res.status(500).json({ message: 'Error', error: error.message });
    }
});


router.get('/getCompanyStaff', async (req, res) => {
    try {
        // Retrieve all companies
        const companyStaff = await Staff.find();

        res.status(200).json(companyStaff);
    } catch (error) {
        console.error('Error retrieving company staff:', error);
        res.status(500).json({ message: 'Error', error: error.message });
    }
})


router.get('/singleCompany/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const company = await Company.findById(id);
        if (!company) {
            res.status(400).json({ message: 'Company Id not found', });
        }

        res.status(200).json(company);
    } catch {
        res.status(500).json({ message: 'Error', error: error.message });
    }
})



router.get('/getSingleCompanyStaffs/:companyName', async (req, res) => {
    try {
        // Retrieve the company name from the URL parameter
        const companyName = req.params.companyName;

        // Find staff members of the specified company
        const companyStaff = await User.find({ company: companyName });

        if (companyStaff.length === 0) {
            return res.status(404).json({ message: 'Company not found' });
        }

        res.status(200).json(companyStaff);
    } catch (error) {
        console.error('Error retrieving company staff:', error);
        res.status(500).json({ message: 'Error', error: error.message });
    }
});



// Get the total loan of all users with the same company name
router.get('/getTotalLoanByCompany/:companyName', async (req, res) => {
    try {
        // Retrieve the company name from the URL parameter
        const companyName = req.params.companyName;

        // Find all users with the specified company name
        const users = await User.find({ company: companyName });

        if (users.length === 0) {
            return res.status(404).json({ message: 'No users found for the company' });
        }

        // Calculate the total loan for all users with the same company name
        let totalLoan = 0;
        for (const user of users) {
            const wallet = await Wallet.findOne({ userId: user._id });
            if (wallet) {
                totalLoan += wallet.totalLoan;
            }
        }

        res.status(200).json({ totalLoan });
    } catch (error) {
        console.error('Error calculating total loan:', error);
        res.status(500).json({ message: 'Error', error: error.message });
    }
});

router.put('/updateUserLoan/:userId', async (req, res) => {
    try {
        const { userId } = req.params
        const paidLoan = req.body.paidLoan

        const user = await Order.find({ userId })
        if (!user) {
            return res.status(400).json({ message: "No user found in the Order" })
        }
        const wallet = await Wallet.findOne({ userId: userId })

        // Calculate the sum of allItemsTotalPrice across all orders
        const totalAllItemsTotalPrice = user.reduce((total, order) => total + order.allItemsTotalPrice, 0);


        // wallet.totalLoan -= paidLoan
        wallet.paidLoan += paidLoan
        wallet.currentLoan -= paidLoan
        await wallet.save();

        res.status(200).json({ wallet, message: "Outstanding loan updated correctly" });
    } catch (error) {
        res.status(500).json({ message: 'Error', error: error.message });
    }

})

router.post('/postPayment', async (req, res) => {
    try {
        const { fullName, vat, serviceFee, deliveryFee, interest } = req.body;

        const exitsummary = await AdminVat.findOne({ vat, serviceFee, deliveryFee, interest })
        if (exitsummary) {
            return res.status(400).json({ message: "VAT,ServiceFee and DeliveryFees already exist" })
        }

        // Create a new staff member
        const newPayment = new AdminVat({
            fullName,
            vat,
            serviceFee,
            deliveryFee,
            interest
        });

        // Save the new staff member to the database
        const savedPayment = await newPayment.save();

        // Return the saved staff member with a 201 Created status
        return res.status(200).json(savedPayment);
    } catch (error) {
        res.status(500).json({ message: "Error", error: error.message })
    }
})


router.get('/getPaymentChargesSummary', async (req, res) => {
    try {
        // Retrieve all orders
        const paymentCharges = await AdminVat.find();

        return res.status(200).json(paymentCharges);
    } catch (error) {
        console.error('Error retrieving paymentCharges:', error);
        res.status(500).json({ message: 'Error', error: error.message });
    }
});

router.get('/flutterwave-public-key', (req, res) => {
    res.json({ publicKey: flutterwavePublicKey });
});

router.get('/getAllCurrentLoan', async (req, res) => {
    try {
        const totalLoanAggregate = await Wallet.aggregate([
            {
                $group: {
                    _id: null,
                    totalLoan: { $sum: '$currentLoan' }
                }
            }
        ]);

        // Extract the totalLoan from the aggregation result
        const totalLoan = totalLoanAggregate.length > 0 ? totalLoanAggregate[0].totalLoan : 0;

        res.status(200).json({ totalLoan });
    } catch (error) {
        console.error('Error calculating total loan:', error);
        res.status(500).json({ message: 'Error', error: error.message });
    }
});


router.get('/getAllPaidLoan', async (req, res) => {
    try {
        const totalLoanAggregate = await Wallet.aggregate([
            {
                $group: {
                    _id: null,
                    totalLoan: { $sum: '$paidLoan' }
                }
            }
        ]);

        // Extract the totalLoan from the aggregation result
        const totalLoan = totalLoanAggregate.length > 0 ? totalLoanAggregate[0].totalLoan : 0;

        res.status(200).json({ totalLoan });
    } catch (error) {
        console.error('Error calculating total loan:', error);
        res.status(500).json({ message: 'Error', error: error.message });
    }
});

router.get('/getAllCompanyPayment', async (req, res) => {
    try {
        // Retrieve all orders
        const paymentCharges = await Payment.find();

        return res.status(200).json(paymentCharges);
    } catch (error) {
        console.error('Error retrieving paymentCharges:', error);
        res.status(500).json({ message: 'Error', error: error.message });
    }
});

router.put('/approveCompanyPayment/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const payment = await Payment.findById(id);
        const companyName = payment.companyName

        if (!payment) {
            return res.status(400).json({ message: 'company payment not found' });
        }
        const users = await User.find({ company: companyName });

        if (users.length === 0) {
            return res.status(404).json([]);
        }

        // Calculate the total loan for all users with the same company name
        // let paidLoanAmount = 0;
        for (const user of users) {
            const wallet = await Wallet.findOne({ userId: user._id });
            if (wallet) {

                paidLoanAmount = wallet.montlyPayBack;
                wallet.paidLoan += paidLoanAmount
                wallet.currentPaidLoan += paidLoanAmount
                await wallet.save()
            }

        }

        // Check if the payment is in a state where it can be accepted
        if (payment.isApproved === false) {
            // Update the payment isApproved to 'approved' or 'accepted'
            payment.isApproved = true;
            await payment.save();

            return res.status(200).json({ message: 'Payment approve successfully' });
        } else {
            return res.status(400).json({ message: 'Payment already verified. Thanks' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Error', error: error.message });
    }
});



module.exports = router;