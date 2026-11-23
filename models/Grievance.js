// models/Grievance.js - PMC Citizen Grievance Mongoose Model
const mongoose = require('mongoose');
const {
  PMC_WARDS,
  GRIEVANCE_CATEGORIES,
  GRIEVANCE_STATUSES,
  PRIORITY_LEVELS,
} = require('./constants');

// Timeline entry schema tracking status transitions
const timelineEntrySchema = new mongoose.Schema(
  {
    status: {
      type: String,
      required: true,
      enum: GRIEVANCE_STATUSES,
    },
    remarks: {
      type: String,
      required: true,
      trim: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    updatedBy: {
      type: String,
      default: 'System',
    },
  },
  { _id: false }
);

// Location sub-document schema
const locationSchema = new mongoose.Schema(
  {
    lat: {
      type: Number,
      default: null,
    },
    lng: {
      type: Number,
      default: null,
    },
    address: {
      type: String,
      required: [true, 'Location address or landmark is required'],
      trim: true,
    },
  },
  { _id: false }
);

const grievanceSchema = new mongoose.Schema(
  {
    grievanceId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },
    title: {
      type: String,
      required: [true, 'Grievance title is required'],
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Grievance description is required'],
      trim: true,
    },
    category: {
      type: String,
      required: [true, 'Grievance category is required'],
      enum: {
        values: GRIEVANCE_CATEGORIES,
        message: '{VALUE} is not a recognized category',
      },
      index: true,
    },
    ward: {
      type: String,
      required: [true, 'Pune ward office is required'],
      enum: {
        values: PMC_WARDS,
        message: '{VALUE} is not a recognized PMC ward office',
      },
      index: true,
    },
    location: {
      lat: {
        type: Number,
        default: null,
      },
      lng: {
        type: Number,
        default: null,
      },
      address: {
        type: String,
        required: [true, 'Location address or landmark is required'],
        trim: true,
      },
    },
    imageUrl: {
      type: String,
      default: null,
    },
    priority: {
      type: String,
      enum: PRIORITY_LEVELS,
      default: 'Medium',
      index: true,
    },
    status: {
      type: String,
      enum: GRIEVANCE_STATUSES,
      default: 'Submitted',
      index: true,
    },
    timeline: {
      type: [timelineEntrySchema],
      default: [],
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    resolutionImage: {
      type: String,
      default: null,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    // Additional optional metadata fields for display & notification
    citizenName: {
      type: String,
      trim: true,
      default: '',
    },
    citizenEmail: {
      type: String,
      trim: true,
      lowercase: true,
      default: '',
    },
    citizenPhone: {
      type: String,
      trim: true,
      default: '',
    },
    assignedOfficer: {
      type: String,
      default: null,
      trim: true,
    },
    resolutionRemarks: {
      type: String,
      default: null,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Helpful indexes for queries
grievanceSchema.index({ ward: 1, status: 1 });
grievanceSchema.index({ category: 1, status: 1 });
grievanceSchema.index({ 'location.lat': 1, 'location.lng': 1 });

module.exports = mongoose.model('Grievance', grievanceSchema);
