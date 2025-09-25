# Dashboard App - Network Access Setup

## 🎯 **Project Overview**

This is your original dashboard application enhanced with file upload functionality and network access capabilities for internal use.

## 🌐 **Network Configuration**

### Access Information

- **Your Computer IP**: `192.168.1.129`
- **Web Application**: `http://192.168.1.129:3000`
- **Local Access**: `http://localhost:3000`

### Features

- ✅ **File Upload System** - Drag-and-drop file uploads
- ✅ **Network Access** - Accessible from any device on your local network
- ✅ **Image Preview** - Preview uploaded images before submission
- ✅ **Progress Tracking** - Visual upload progress indicators
- ✅ **File Validation** - Size and type validation

## 🚀 **Starting the Application**

### Network Access (For Client Devices)

```batch
# Option 1: Batch file
start-network.bat

# Option 2: PowerShell script
.\start-network.ps1

# Option 3: Direct command
npm run dev:network
```

### Local Development

```bash
npm run dev
```

## 📱 **Client Access Instructions**

1. **Ensure all devices are on the same WiFi network**
2. **On client device, open web browser**
3. **Navigate to**: `http://192.168.1.129:3000`
4. **Click "Upload Files" to access the upload interface**

## 📁 **File Upload**

- **Supported formats**: Images (JPEG, PNG, GIF), PDFs, and common document types
- **File size limit**: 10MB per file
- **Multiple files**: Upload multiple files simultaneously
- **Storage location**: Files saved to `/uploads/` directory

## 🛠️ **Project Structure**

```
dash-app/
├── src/
│   ├── app/
│   │   ├── api/upload/         # File upload API
│   │   ├── upload/            # Upload page
│   │   ├── layout.tsx
│   │   └── page.tsx          # Main dashboard
│   └── components/
│       ├── FileUpload.tsx    # Upload component
│       └── UploadModal.tsx   # Modal component
├── uploads/                   # Uploaded files directory
├── start-network.bat         # Network startup script (Windows)
├── start-network.ps1         # Network startup script (PowerShell)
└── package.json              # Dependencies and scripts
```

## 🔧 **Troubleshooting**

### If clients can't access the application:

1. **Check Windows Firewall**: Allow Node.js through Windows Firewall
2. **Verify Network**: Ensure all devices are on the same WiFi/network
3. **Check IP Address**: Run `ipconfig` to verify current IP (may change with DHCP)
4. **Port Issues**: Ensure port 3000 is not blocked by antivirus software

### Common Issues:

- **IP Changed**: If your computer gets a new IP, update the scripts
- **Firewall Blocking**: Add exceptions for port 3000
- **Network Issues**: Verify devices can ping each other

## 💡 **Usage Tips**

- **Bookmark the URL** on client devices for easy access
- **Keep host computer running** while clients use the app
- **Monitor uploads** - uploaded files appear in the `/uploads/` folder
- **File management** - Manually manage uploaded files as needed

## 🔒 **Security Notes**

- This setup is for **internal network use only**
- Do not expose to the internet without proper security measures
- Ensure your WiFi network is secure (WPA3/WPA2)
- Consider file cleanup policies for uploaded content

---

**Note**: This is a development setup optimized for internal network use. For production deployment, consider implementing authentication, database storage, and proper security measures.
