import { Module } from "../api/sections/module-model.js";
import { Role } from "../api/roles/role-model.js";
import { User } from "../api/users/user-model.js";
import { CompanyDetails } from "../api/settings/company-settings/company-settings-model.js";
import { AppEmailSettings } from "../api/settings/app-settings/app-settings-model.js";
import { asyncHandler } from "./asyncHandler-utils.js";
import Router from "express";
import { ApiResponse } from "./api-Responnse-utils.js";
import { ApiError } from "./api-error-utils.js";
// Initialiasation of the project
//Bulk save method to save all the modules at once
const all_Modules = [
    "dashboard",
    "user",
    "role",
    "customer","customer-ledger",
    "company-settings","app-settings","account-settings"
    ,"inventory","product","tax","category","batch"
    ,"invoice",
    "vendor","vendor-ledger",
    "purchase",
    "payment",
];
const updateExistingModulesName = asyncHandler(async (req,res,next) => {
    const updateArray = [
        {oldName : "company_setting", newName : "company-settings"},
        {oldName : "app_setting", newName : "app-settings"},
        {oldName : "profile_setting", newName : "account-settings"},
        // {oldName : "sales_return", newName : "sales-return"},
        // {oldName : "purchase_return", newName : "purchase-return"},
        // {oldName : "customer_portal", newName : "customer-portal"},
        // {oldName : "sales_report", newName : "sales-report"},
        // {oldName : "purchase_report", newName : "purchase-report"},
        // {oldName : "invetory_report", newName : "inventory-report"},
    ]
    try {
        for (const element of updateArray) {
            const module = await Module.findOne({ name: element.oldName });
            if(module) {
                module.name = element.newName;
                await module.save();
            }
        }
        res.status(200).json(ApiResponse.successUpdated("All modules updated successfully"));
    } catch (error) {
        console.log("Error while updating modules:", error);
        return next(ApiError.dataNotUpdated("Failed to update the data"))
    }
});

const saveAllModules = asyncHandler (async(req,res,next) => {
    // Finding all the existing modules and storing them in a set
        const allExistingModules = await Module.find();
        const setOfAllExistingModule = new Set(allExistingModules.map((module) => module.name));

    // Iterating over all the modules and saving them if they don't exist
        all_Modules.forEach(async (module) => {
            if(!setOfAllExistingModule.has(module)) {
                const newModule = new Module({ name: module });
                await newModule.save();
        }
    })
    res.status(201).json(ApiResponse.successCreated("All modules saved successfully"));
})


// Create a super admin role 
const createSuperAdminRole = asyncHandler(async (req,res,next) => {
    try {
        // Check if the super admin role already exists
        let role = await Role.findOne({ name: "super admin" });

        if (!role) {
            // Create the super admin role if it doesn't exist
            role = await Role.create({
                name: "super admin",
                sections: []
            });
        }

        // Fetch all the modules and store them in a set
        const allfetchedModules = await Module.find();
        const setOfAllExistingModule = new Set(role.sections.map(section => section.module.toString()));

        // Update the role with new sections
        const newSections = allfetchedModules
            .filter(module => !setOfAllExistingModule.has(module._id.toString()))
            .map(module => ({
                module: module._id,
                permission: 15
            }));

            
        role.sections.push(...newSections);
        await role.save();

        res.status(201).json(ApiResponse.successCreated(role, "Super admin role created successfully"));
    } catch (error) {
        console.log("Error while creating or updating super admin role:", error);
    }
});

const createUserSuperAdmin = asyncHandler(async (req,res,next) => {
    try {
        // Check if the super admin user already exists
        const getId = await Role.findOne({ name: "super admin" });
        const count = await User.countDocuments(
            { name : "super admin",email: "superadmin@mail.com",mobileNo: "+91 9999999999", }
        );

        if(count > 0) {
            return next(ApiError.valueAlreadyExists("Super admin user already exists"));
        }
        else{
            // Create the super admin user if it doesn't exist
            const user = await User.create({
                name: "super admin",
                email: "superadmin@mail.com",
                mobileNo: "+91 9999999999",
                password: "Admin@1234",
                role : getId._id,
        })
        return res.status(201).json(ApiResponse.successCreated(user, "Super admin user created successfully"));};
    }
     catch (error) {   
        console.log("Error while creating super admin user:", error);
    }
});


const setCompanyDetails = asyncHandler(async (req,res,next) => {
    const {
        name,
        mobileNo,
        addressLine1,
        city,
        state,
        pincode,
        country,
    } = req.body;

    const address = {
        addressLine1,
        city,
        state,
        pincode,
        country,
    };

    const companyDetails = new CompanyDetails({
        name,
        mobileNo,
        address
    });

    try {
        const savedCompanyDetails = await companyDetails.save();

        const { isDeleted, __v, ...remaining } = savedCompanyDetails.toObject();

        return res
            .status(201)
            .json(
                ApiResponse.successCreated(remaining, "Company details have been set successfully")
            );
            
    } catch (error) {
        console.log(`Error setting company details: ${error}`);
        return next(ApiError.dataNotInserted("Error setting company details", error));
    }
});

const setEmailSettings = asyncHandler(async (req, res, next) => {
    try {
        const existingSettings = await AppEmailSettings.find();
        
        if (existingSettings.length > 0) {
            return next(ApiError.valueAlreadyExists("Email settings already exists"));
        }

        const emailSettings = new AppEmailSettings({
            email: "your-email@company.com",
            credential: "your-default-password",
            smtpHost: "smtp.gmail.com",
            smtpPort: 587
        });

        const savedSettings = await emailSettings.save();
        const { isDeleted, __v, _id, ...remaining } = savedSettings.toObject();

        return res
            .status(201)
            .json(
                ApiResponse.successCreated(remaining, "Email settings have been set successfully")
            );
    } catch (error) {
        console.log(`Error setting email settings: ${error}`);
        return next(ApiError.dataNotInserted("Error setting email settings", error));
    }
});

// Create a super admin user
const seederRouter = Router();
seederRouter.post("/save-modules", saveAllModules);
seederRouter.post("/create-super-admin-role", createSuperAdminRole);
seederRouter.post("/create-super-admin-user", createUserSuperAdmin);
seederRouter.post("/update-modules", updateExistingModulesName);
seederRouter.post("/set-company-details", setCompanyDetails);
seederRouter.post("/set-email-settings", setEmailSettings);

export default seederRouter;



