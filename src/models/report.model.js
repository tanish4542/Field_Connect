import mongoose from 'mongoose';

const reportSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      index: true,
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
    },
    images: [
      {
        type: String,
        required: [true, 'At least one image is required'],
      },
    ],
    location: {
      lat: {
        type: Number,
        required: [true, 'Latitude is required'],
      },
      lng: {
        type: Number,
        required: [true, 'Longitude is required'],
      },
      address: {
        type: String,
        required: [true, 'Address is required'],
        trim: true,
      },
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
      index: true,
    },
    submittedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Submitted by is required'],
      index: true,
    },
    isSynced: {
      type: Boolean,
      default: false,
    },
    syncedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// Index for location-based queries
reportSchema.index({ 'location.lat': 1, 'location.lng': 1 });

// Index for status and date queries
reportSchema.index({ status: 1, createdAt: -1 });

export const Report = mongoose.model('Report', reportSchema); 