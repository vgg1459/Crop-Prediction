require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const multer = require("multer");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const path = require("path");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));



// Static folder for uploads
app.use("/uploads", express.static("uploads"));

// Multer Storage Configuration for file uploads
const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});
const upload = multer({ storage });

// Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected..."))
  .catch((err) => console.error("❌ MongoDB Connection Error:", err));

// Define MongoDB Schema for Land Listings
const LandSchema = new mongoose.Schema({
  landTitle: String,
  location: String,
  price: Number,
  landSize: Number,
  images: [String],
  documents: [String],
  soilType: String,
  description: String,
  sellerName: String,
  sellerPhone: String,
  sellerEmail: String,
  sellerId: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
});
const LandListing = mongoose.model("LandListing", LandSchema);
// ✅ Middleware to verify JWT token
const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Unauthorized. No token provided." });
  }

  const token = authHeader.split(" ")[1]; // Extract token

  try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded;
      next();
  } catch (error) {
      return res.status(403).json({ message: "Invalid or expired token." });
  }
};


// ✅ API to Submit Land Listing
app.post("/api/sell-land", authenticate, upload.fields([{ name: "images" }, { name: "documents" }]), async (req, res) => {
  try {
      const { location, price, landSize, soilType, description, sellerName, sellerPhone, sellerEmail } = req.body;

      const images = req.files["images"] ? req.files["images"].map(file => file.path) : [];
      const documents = req.files["documents"] ? req.files["documents"].map(file => file.path) : [];

      const newListing = new LandListing({
          location,
          price,
          landSize,
          soilType,
          description,
          images,
          documents,
          sellerName,    // ✅ Now properly extracted from req.body
          sellerPhone,   // ✅ Now properly extracted from req.body
          sellerEmail,   // ✅ Now properly extracted from req.body
          sellerId: req.user.userId // ✅ Associate listing with the logged-in seller
      });
      
      await newListing.save();
      res.status(201).json({ message: "Land listing created successfully!", listing: newListing });

  } catch (error) {
      console.error("❌ Error creating land listing:", error);
      res.status(500).json({ message: "Server error. Please try again." });
  }
});


// ✅Fetch all land listings from MongoDB
app.get("/api/get-lands", async (req, res) => {
  try {
      const lands = await LandListing.find(); // Fetch all land listings from MongoDB
      res.status(200).json(lands);
  } catch (error) {
      console.error("Error fetching land listings:", error);
      res.status(500).json({ message: "Server error. Could not fetch data." });
  }
});


// Define MongoDB Schema for User Authentication (with mobileNo)
const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  mobileNo: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: [String], required: true }, // Array of roles (Buyer, Seller)
  savedListings: [{ type: mongoose.Schema.Types.ObjectId, ref: "LandListing" }], // User's saved listings
  preferredLocations: { type: [String], default: [] }, // ✅ Fixed issue: Now defined properly
  cart: [{ type: mongoose.Schema.Types.ObjectId, ref: "LandListing" }]
});

const User = mongoose.model("User", UserSchema);

// ✅ Signup Endpoint
app.post("/api/signup", async (req, res) => {
  try {
    const { username, email, mobileNo, password, role } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: "Email already in use" });

    const existingMobile = await User.findOne({ mobileNo });
    if (existingMobile) return res.status(400).json({ message: "Mobile number already in use" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ username, email, mobileNo, password: hashedPassword, role });

    await newUser.save();
    res.status(201).json({ message: "User created successfully" });
  } catch (error) {
    console.error("❌ Error during signup:", error);
    res.status(500).json({ message: "Server error. Please try again later." });
  }
});

// ✅ Login Endpoint
app.post("/api/login", async (req, res) => {
  try {
    const { email, password, role } = req.body;
    const user = await User.findOne({ email });

    if (!user) return res.status(404).json({ message: "User not found" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

    if (!user.role.includes(role)) return res.status(403).json({ message: `Access denied for role: ${role}` });

    const token = jwt.sign({ userId: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: "1h" });

    res.status(200).json({
      message: "Login successful",
      token,
      user: { id: user._id, username: user.username, email: user.email, role: user.role },
    });
  } catch (error) {
    console.error("❌ Error during login:", error);
    res.status(500).json({ message: "Server error. Please try again later." });
  }
});

// ✅ API to Fetch User Profile
// ✅ API to Fetch User Profile
app.get("/api/user-profile", authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });

    res.json(user);
  } catch (error) {
    console.error("❌ Error fetching profile:", error);
    res.status(500).json({ message: "Server error. Please try again later." });
  }
});
//saved-listings
app.post("/api/save-listing/:listingId", authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const listingId = req.params.listingId;
    console.log("📝 Saving listing:", listingId); // Debugging

    if (!user.savedListings.includes(listingId)) {
      user.savedListings.push(listingId);
      await user.save();
      console.log("✅ Listing saved!");
    } else {
      console.log("⚠ Listing already saved.");
    }

    res.json({ message: "Listing saved successfully" });
  } catch (error) {
    console.error("❌ Error saving listing:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// ✅ API to Fetch Saved Listings
app.get("/api/saved-listings", authenticate, async (req, res) => {
  try {
      const user = await User.findById(req.user.userId).populate({
          path: "savedListings",
          model: "LandListing",
          select: "location price"
      });

      if (!user) {
          console.log("❌ User not found!");
          return res.status(404).json({ message: "User not found" });
      }

      console.log("✅ Saved Listings Fetched from DB:", user.savedListings); // Debugging
      res.json(user.savedListings);
  } catch (error) {
      console.error("❌ Error fetching saved listings:", error);
      res.status(500).json({ message: "Server error" });
  }
});



// ✅ API to Remove Saved Listing
app.delete("/api/remove-saved/:listingId", authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const listingId = new mongoose.Types.ObjectId(req.params.listingId); // Ensure it's ObjectId
    user.savedListings = user.savedListings.filter(id => !id.equals(listingId));

    await user.save();
    res.status(200).json({ message: "Listing removed successfully" });
  } catch (error) {
    console.error("❌ Error removing saved listing:", error);
    res.status(500).json({ message: "Server error. Please try again later." });
  }
});

// ✅ API to Save User Preferences
app.post("/api/save-preferences", authenticate, async (req, res) => {
  try {
    const { preferredLocations } = req.body;
    const user = await User.findById(req.user.userId);

    if (!user) return res.status(404).json({ message: "User not found" });

    user.preferredLocations = preferredLocations;
    await user.save();

    res.status(200).json({ message: "Preferences saved successfully!" });
  } catch (error) {
    console.error("❌ Error saving preferences:", error);
    res.status(500).json({ message: "Server error. Please try again." });
  }
});

// ✅ API to Add Listing to Cart
app.post("/api/add-to-cart/:listingId", authenticate, async (req, res) => {
  try {
      const user = await User.findById(req.user.userId);
      if (!user) return res.status(404).json({ message: "User not found" });

      const listingId = req.params.listingId;

      // Check if listing ID is a valid ObjectId
      if (!mongoose.Types.ObjectId.isValid(listingId)) {
          return res.status(400).json({ message: "Invalid Listing ID" });
      }

      // Ensure the listing exists
      const listing = await LandListing.findById(listingId);
      if (!listing) return res.status(404).json({ message: "Listing not found" });

      // Prevent duplicate entries
      if (!user.cart.includes(listingId)) {
          user.cart.push(listingId);
          await user.save();
          console.log("✅ Listing added to cart!");
      } else {
          console.log("⚠ Listing already in cart.");
      }

      res.json({ message: "Listing added to cart successfully" });
  } catch (error) {
      console.error("❌ Error adding to cart:", error);
      res.status(500).json({ message: "Server error" });
  }
});


// ✅ API to Fetch Cart Listings
app.get("/api/cart-listings", authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).populate({
      path: "cart",
      model: "LandListing",
      select: "location price"
    });

    if (!user) {
      console.log("❌ User not found!");
      return res.status(404).json({ message: "User not found" });
    }

    console.log("✅ Cart Listings Fetched from DB:", user.cart); // Debugging
    res.json(user.cart);
  } catch (error) {
    console.error("❌ Error fetching cart listings:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// ✅ API to Remove Listing from Cart
app.delete("/api/remove-cart/:listingId", authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const listingId = new mongoose.Types.ObjectId(req.params.listingId); // Ensure it's ObjectId
    user.cart = user.cart.filter(id => !id.equals(listingId));

    await user.save();
    res.status(200).json({ message: "Listing removed from cart successfully" });
  } catch (error) {
    console.error("❌ Error removing from cart:", error);
    res.status(500).json({ message: "Server error. Please try again later." });
  }
});
// ✅ API to Fetch Seller's Listings
app.get("/api/my-listings", authenticate, async (req, res) => {
  try {
    const listings = await LandListing.find({ sellerId: req.user.userId }); // Fetch listings for the logged-in seller
    res.status(200).json(listings);
  } catch (error) {
    console.error("❌ Error fetching seller listings:", error);
    res.status(500).json({ message: "Server error. Could not fetch listings." });
  }
});
// ✅ API to Delete a Listing
app.delete("/api/delete-listing/:listingId", authenticate, async (req, res) => {
  try {
    const listingId = req.params.listingId;
    const listing = await LandListing.findById(listingId);

    if (!listing) {
      return res.status(404).json({ message: "Listing not found" });
    }

    // Ensure only the seller can delete their own listing
    if (listing.sellerId.toString() !== req.user.userId) {
      return res.status(403).json({ message: "Unauthorized. You can only delete your own listings." });
    }

    await LandListing.findByIdAndDelete(listingId);
    res.status(200).json({ message: "Listing deleted successfully" });
  } catch (error) {
    console.error("❌ Error deleting listing:", error);
    res.status(500).json({ message: "Server error. Could not delete listing." });
  }
});
// ✅ seller-profile
app.get("/api/seller-profile", authenticate, async (req, res) => {
  try {
      const seller = await User.findById(req.user.userId).select("-password");

      if (!seller) return res.status(404).json({ message: "Seller not found" });

      // Fetch seller's listings
      const listings = await LandListing.find({ sellerId: req.user.userId });

      // Calculate Stats
      const totalListings = listings.length;
      const listingsSold = listings.filter(l => l.sold).length;
      const activeListings = listings.filter(l => !l.sold).length;
      const totalViews = listings.reduce((acc, l) => acc + (l.views || 0), 0);
      const inquiries = listings.reduce((acc, l) => acc + (l.inquiries || 0), 0);

      res.json({
          fullName: seller.username,
          email: seller.email,
          phone: seller.mobileNo,
          companyName: seller.companyName || "",
          experience: seller.experience || 0,
          totalListings,
          listingsSold,
          activeListings,
          totalViews,
          inquiries
      });

  } catch (error) {
      console.error("❌ Error fetching seller profile:", error);
      res.status(500).json({ message: "Server error. Please try again later." });
  }
});
// Move to Cart from saved
app.post("/api/move-to-cart/:listingId", authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const listingId = req.params.listingId;

    // Remove from saved listings
    user.savedListings = user.savedListings.filter(id => id.toString() !== listingId);

    // Add to cart if not already present
    if (!user.cart.includes(listingId)) {
      user.cart.push(listingId);
    }

    await user.save();
    res.json({ message: "Listing moved to cart successfully!" });
  } catch (error) {
    console.error("❌ Error moving listing to cart:", error);
    res.status(500).json({ message: "Server error. Please try again later." });
  }
});
// ✅ API to Fetch Land Details
app.get("/api/get-land/:id", async (req, res) => {
  try {
      const landId = req.params.id;
      
      // Validate ObjectId
      if (!mongoose.Types.ObjectId.isValid(landId)) {
          return res.status(400).json({ error: "Invalid Land ID" });
      }

      const land = await LandListing.findById(landId);

      if (!land) {
          return res.status(404).json({ error: "Land not found" });
      }

      res.json(land);
  } catch (error) {
      console.error("❌ Error fetching land details:", error);
      res.status(500).json({ error: "Internal Server Error" });
  }
});

// ✅ Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
