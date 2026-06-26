# Quick Start: Admin Analytics Dashboard

## 🚀 Getting Started in 5 Minutes

### Step 1: Create First Admin Account

1. **Navigate to Setup Page**
   ```
   http://localhost:5000/admin/setup
   ```

2. **Enter Setup Key** (default)
   ```
   drivers-on-demand-2024
   ```

3. **Fill in Your Details**
   - Name: Your Name
   - Email: your-email@example.com
   - Password: (min 8 characters)
   - Confirm Password

4. **Click "Create Super Admin Account"**
   - You'll be redirected to login
   - Use your email and password to log in

### Step 2: Access Analytics Dashboard

1. **Login** at `/auth/login`
2. **Navigate to Analytics** at `/admin/analytics`
3. **Explore Four Tabs:**
   - 📊 Revenue Trends
   - 👥 Driver Performance
   - 📅 Booking Heatmap
   - 📍 Locations

### Step 3: Create Additional Admins (Optional)

1. **Navigate to Admin Management** at `/admin/admins`
2. **Click "Create Admin"**
3. **Choose Role:**
   - **Super Admin**: Full access + can create admins
   - **Moderator**: Limited access, cannot create admins
4. **Fill form and submit**

---

## 📊 What You Get

### Revenue Trends
- **Daily revenue chart** (last 30 days)
- **Booking volume** bar chart
- **Commission tracking** with area charts
- **Status distribution** pie chart

### Driver Performance
- **Top 10 drivers** by trips & earnings
- **Rating comparison** horizontal bars
- **Acceptance rates** visualization
- **Detailed metrics table** with rankings

### Booking Heatmap
- **7x24 activity grid** (days × hours)
- **Peak hours analysis** line chart
- **Color-coded intensity** (darker = busier)
- **Hover for exact counts**

### Location Analytics
- **Top 20 locations** bar chart
- **Popular areas** card grid
- **Pickup & destination** combined data

---

## 🔐 Security Setup

### Change Default Setup Key

**After creating first admin:**

```bash
# In your .env file
VITE_ADMIN_SETUP_KEY=your-new-secret-key-here
```

**Generate secure key:**
```bash
# Linux/Mac
openssl rand -hex 32

# Or use
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Disable Setup Page (Production)

**Option 1: Environment Check**
```typescript
// In FirstTimeSetup.tsx
useEffect(() => {
  if (import.meta.env.PROD && hasAdminUsers) {
    setLocation('/admin/dashboard');
  }
}, []);
```

**Option 2: Remove Route**
```typescript
// In App.tsx - Remove this line in production
<Route path="/admin/setup" component={FirstTimeSetup} />
```

---

## 📋 Admin Roles Explained

### Super Admin (👑)
- ✅ View analytics
- ✅ Manage all users
- ✅ Create/deactivate admins
- ✅ Access admin management
- ✅ Configure settings
- ✅ Full platform control

### Moderator (⚙️)
- ✅ View analytics
- ✅ Manage drivers & clients
- ✅ Monitor bookings
- ✅ Resolve disputes
- ❌ Cannot create admins
- ❌ Cannot access admin management

---

## 🛠️ Troubleshooting

### "Analytics show no data"
**Cause**: No bookings in database yet
**Solution**: 
- Create test bookings
- Wait for real user activity
- Check API endpoints return data

### "Cannot access /admin/analytics"
**Cause**: Not logged in as admin
**Solution**:
- Login with admin credentials
- Check `role` in user metadata is 'admin'
- Verify admin_users table has your record

### "Setup key doesn't work"
**Cause**: Environment variable mismatch
**Solution**:
- Check `.env` file has `VITE_ADMIN_SETUP_KEY`
- Default is `drivers-on-demand-2024`
- Restart dev server after changing

### Charts not rendering
**Cause**: Missing recharts library
**Solution**:
```bash
npm install recharts
npm run dev
```

---

## 💡 Pro Tips

### Optimize Analytics Loading
```typescript
// Add caching
const { data } = useQuery({
  queryKey: ['/api/admin/analytics/revenue'],
  staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  cacheTime: 10 * 60 * 1000,
});
```

### Export Chart Data
```typescript
// Add export button
const exportCSV = () => {
  const csv = revenueData.map(d => 
    `${d.date},${d.revenue},${d.bookings}`
  ).join('\n');
  
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'revenue-data.csv';
  a.click();
};
```

### Custom Date Ranges
```typescript
// Add date range picker
const [dateRange, setDateRange] = useState({
  from: subDays(new Date(), 30),
  to: new Date()
});

// Use in query
const { data } = useQuery({
  queryKey: ['/api/admin/analytics/revenue', dateRange],
  queryFn: () => fetchRevenue(dateRange),
});
```

---

## 🎯 Common Use Cases

### Morning Dashboard Check
1. Login to admin panel
2. Check `/admin/dashboard` for overview
3. Review `/admin/analytics` for trends
4. Check `/admin/disputes` for open issues

### Weekly Performance Review
1. Go to Analytics > Driver Performance
2. Identify top performers
3. Note low acceptance rates
4. Plan driver training/rewards

### Resource Planning
1. Open Analytics > Booking Heatmap
2. Identify peak hours
3. Plan driver availability
4. Adjust pricing strategies

### Business Reporting
1. Analytics > Revenue Trends
2. Export chart data
3. Create monthly report
4. Share with stakeholders

---

## 📖 Next Steps

1. ✅ Create your first admin account
2. ✅ Explore the analytics dashboard
3. ✅ Create a moderator account
4. ✅ Test all admin features
5. ✅ Secure your setup key
6. 📱 Set up notifications (future)
7. 📊 Configure custom reports (future)
8. 🔄 Enable auto-reports (future)

---

## 🔗 Related Documentation

- [Complete Admin Analytics Documentation](./ADMIN_ANALYTICS_SETUP.md)
- [Admin System Documentation](./ADMIN_SYSTEM_DOCUMENTATION.md)
- [API Endpoints Reference](./ADMIN_ANALYTICS_SETUP.md#api-endpoints)
- [Database Schema](./supabase_schema.sql)

---

## ✅ Checklist

Before going to production:

- [ ] Created first super admin account
- [ ] Changed default setup key
- [ ] Tested analytics dashboard
- [ ] Created at least one moderator
- [ ] Verified all API endpoints work
- [ ] Checked RLS policies on admin_users table
- [ ] Backed up admin credentials
- [ ] Documented admin procedures
- [ ] Tested admin deactivation
- [ ] Secured environment variables

---

## 🆘 Need Help?

**Setup Issues:**
- Check environment variables are set
- Verify Supabase connection
- Review browser console for errors

**Access Issues:**
- Confirm admin_users table exists
- Check RLS policies are enabled
- Verify user role in database

**Data Issues:**
- Ensure bookings exist in database
- Check API endpoints return data
- Verify date ranges are correct

---

**You're all set!** 🎉

Start exploring your analytics dashboard and managing your platform effectively!
