# Admin Operations Guide

## Overview

This guide covers all administrative functions within the Nutridelight Orders system, including order management, restaurant management, and system oversight.

## Access and Authentication

### Admin Login
1. Navigate to `/admin/login`
2. Enter admin password (default: admin123)
3. Session persists until browser close
4. Auto-logout after inactivity

### Admin Panel Access
- URL: `/admin`
- Requires active admin session
- Full system access and control
- Real-time data updates

## Dashboard Overview

### Main Sections
- **Order Management**: Process and track customer orders
- **Restaurant Management**: Manage customer accounts
- **Purchase Planning**: View and plan stock purchases
- **Sales & Invoicing**: Generate and manage invoices
- **System Reports**: View operational metrics

### Real-time Updates
- Auto-refresh every 15 seconds (configurable)
- Live order status changes
- New order notifications
- System alerts and warnings

## Order Management

### Order Processing Workflow

#### 1. View New Orders
- Orders appear in "Pending" status
- Sort by timestamp, restaurant, or value
- Filter by date range or restaurant
- Quick view of order details

#### 2. Confirm Orders
- Review order items and quantities
- Check item availability
- Confirm pricing based on market rates
- Update status to "Confirmed"

#### 3. Purchase Planning
- Aggregate confirmed orders
- Generate purchase requirements
- Check current stock levels
- Create purchase plans

#### 4. Order Fulfillment
- Update status to "Purchase Done"
- Coordinate with purchase team
- Plan delivery routes
- Update to "Out for Delivery"

#### 5. Delivery Confirmation
- Mark orders as "Delivered"
- Record delivery time
- Note any issues or shortages
- Generate invoices

### Order Details View

#### Information Available
- Restaurant information
- Order items with quantities
- Special notes and requirements
- Order timestamps
- Status history

#### Actions Available
- Edit order quantities
- Update order status
- Add internal notes
- Generate invoice
- Communicate with restaurant

### Bulk Operations
- Select multiple orders
- Bulk status updates
- Mass invoice generation
- Export order data
- Send notifications

## Restaurant Management

### Restaurant Registration
1. Click "Add Restaurant"
2. Fill in restaurant details:
   - Name and contact information
   - Delivery address
   - Operating hours
   - Special requirements
3. Generate unique restaurant slug
4. Share ordering URL with restaurant

### Restaurant Details
- Contact information
- Delivery preferences
- Order history
- Payment status
- Special notes

### Restaurant Operations
- Edit restaurant information
- Update delivery schedules
- Manage payment terms
- View order patterns
- Deactivate accounts

## Purchase Planning

### Demand Aggregation
- Automatic aggregation of confirmed orders
- Item-wise quantity requirements
- Category-wise demand analysis
- Historical demand patterns

### Stock Management
- Current inventory levels
- Stock variance tracking
- Reorder point calculations
- Safety stock maintenance

### Purchase Plan Creation
1. Review aggregated demand
2. Check current stock levels
3. Calculate purchase requirements
4. Set supplier preferences
5. Create purchase orders

### Supplier Coordination
- Supplier contact information
- Price comparison tools
- Quality rating system
- Delivery scheduling

## Sales and Invoicing

### Invoice Generation
- Automatic invoice creation
- Customizable invoice templates
- Tax calculation support
- Discount and charge management

### Invoice Details
- Restaurant information
- Order line items
- Unit prices and totals
- Taxes and discounts
- Payment terms

### Payment Tracking
- Payment status monitoring
- Partial payment support
- Due date management
- Payment reminders

### Financial Reports
- Revenue by restaurant
- Payment collection metrics
- Outstanding invoices
- Cash flow analysis

## System Administration

### User Management
- Admin user accounts
- Role-based permissions
- Activity logging
- Session management

### System Configuration
- Order cutoff times
- Delivery schedules
- Notification settings
- Backup configurations

### Data Management
- Database backups
- Data export tools
- System cleanup
- Performance monitoring

## Reports and Analytics

### Operational Reports
- Daily order summary
- Delivery performance
- Stock utilization
- Customer satisfaction

### Financial Reports
- Revenue analysis
- Cost tracking
- Profit margins
- Payment collections

### Business Intelligence
- Order trends
- Seasonal patterns
- Customer behavior
- Market analysis

## Troubleshooting

### Common Issues

**Order Not Appearing**
- Check order timestamp
- Verify restaurant status
- Refresh browser
- Check system logs

**Status Update Failures**
- Verify user permissions
- Check internet connection
- Try again after refresh
- Contact technical support

**Invoice Generation Errors**
- Verify order completion
- Check restaurant details
- Validate pricing data
- Review system logs

**Performance Issues**
- Check internet speed
- Clear browser cache
- Close unused tabs
- Report to technical team

### System Maintenance
- Regular database optimization
- Log file cleanup
- Performance monitoring
- Security updates

## Best Practices

### Order Processing
- Process orders promptly
- Maintain consistent status updates
- Communicate clearly with restaurants
- Document special requirements

### Data Management
- Regular data backups
- Validate data integrity
- Monitor system performance
- Maintain audit trails

### Customer Service
- Respond to inquiries quickly
- Provide accurate information
- Escalate issues appropriately
- Maintain professional communication

## Security Considerations

### Access Control
- Strong password policies
- Session timeout management
- Multi-factor authentication
- Regular access reviews

### Data Protection
- Encrypt sensitive data
- Regular security audits
- Compliance with regulations
- Incident response procedures

## Emergency Procedures

### System Outages
- Notify all stakeholders
- Switch to manual processes
- Document all transactions
- Resume normal operations

### Data Recovery
- Restore from recent backups
- Validate data integrity
- Communicate with users
- Implement preventive measures

## Training and Onboarding

### New Admin Training
- System overview and navigation
- Order processing procedures
- Restaurant management
- Report generation

### Ongoing Education
- System update notifications
- Process improvement sessions
- Cross-functional training
- Best practice sharing

## Integration with Other Systems

### Accounting Software
- Invoice data export
- Payment reconciliation
- Financial reporting
- Tax compliance

### Communication Systems
- SMS notifications
- Email confirmations
- WhatsApp integration
- Customer support tools

## Mobile Access

### Admin Mobile App
- Order status updates
- Restaurant communication
- Basic report viewing
- Emergency notifications

### Responsive Web Access
- Full functionality on mobile
- Touch-optimized interface
- Offline capability
- Push notifications
