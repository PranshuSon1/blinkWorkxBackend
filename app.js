// Import required modules
const express = require('express');
const { Sequelize, DataTypes } = require('sequelize');
const dotenv = require("dotenv").config();
// Initialize Express app
const app = express();
const cors = require('cors');
const PORT = 4005;
app.use(express.json());
app.use(cors());
const db = {};


// Database connection using Sequelize
const sequelize = new Sequelize(process.env.DATABASE_NAME,process.env.DATABASE_USER,process.env.DATABASE_PASSWORD,{
  host : process.env.DATABASE_HOST,
  dialect: "postgres",
  logging :false,
  pool:{max:5,min:0,idle:10000}
});
sequelize.authenticate().then(()=>{
  console.log("Authenticated")
}).catch(err=>{
  console.log('error', err)
});

db.sequelize = sequelize;
db.Sequelize = Sequelize;

const Order = sequelize.define('Order', {
  id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
  },
  orderDescription: {
      type: DataTypes.STRING(100),
      allowNull: false,
  },
  createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: Sequelize.NOW,
  },
}, {
  tableName: 'Orders',
  timestamps: false,
});
const Product = sequelize.define('Product', {
  id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
  },
  productName: {
      type: DataTypes.STRING(100),
      allowNull: false,
  },
  productDescription: {
      type: DataTypes.TEXT,
  },
}, {
  tableName: 'Products',
  timestamps: false,
});
const OrderProductMap = sequelize.define('OrderProductMap', {
  id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
  },
  orderId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
          model: Order,
          key: 'id',
      },
  },
  productId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
          model: Product,
          key: 'id',
      },
  },
}, {
  tableName: 'OrderProductMap',
  timestamps: false,
});

async function initializeDatabase() {
  try {
      await sequelize.authenticate();
      console.log('Connection has been established successfully.');

      await sequelize.sync({ force: true });
      console.log('Tables have been created successfully.');

      // Insert initial data into Products table
      await Product.bulkCreate([
          { id: 1, productName: 'HP laptop', productDescription: 'This is HP laptop' },
          { id: 2, productName: 'Lenovo laptop', productDescription: 'This is Lenovo laptop' },
          { id: 3, productName: 'Car', productDescription: 'This is Car' },
          { id: 4, productName: 'Bike', productDescription: 'This is Bike' },
      ]);
      console.log('Initial data inserted into Products table.');
  } catch (error) {
      console.error('Unable to connect to the database:', error);
  } finally {
      await sequelize.close();
  }
}

// initializeDatabase();
// Sync database
sequelize.sync({force:false})
    .then(() => console.log('Database synced'))
    .catch(err => console.error('Error syncing database:', err));

// REST APIs

// GET all orders
app.get('/api/orders', async (req, res) => {
  try {
      const orders = await Order.findAll({
        //   include: [
        //       {
        //           model: OrderProductMap,
        //           include: [Product]
        //       }
        //   ]
      });
      res.json(orders);
  } catch (error) {
      res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// GET order by ID
app.get('/api/orders/:id', async (req, res) => {
  try {
      const order = await Order.findByPk(req.params.id, {
          include: [
              {
                  model: OrderProductMap,
                  include: [Product]
              }
          ]
      });
      if (order) {
          res.json(order);
      } else {
          res.status(404).json({ error: 'Order not found' });
      }
  } catch (error) {
      res.status(500).json({ error: 'Failed to fetch order' });
  }
});

// POST create a new order
app.post('/api/orders', async (req, res) => {
  try {
      const { orderDescription, productIds } = req.body;
      const order = await Order.create({ orderDescription });
      if (productIds && productIds.length) {
          const orderProducts = productIds.map(productId => ({ orderId: order.id, productId }));
          await OrderProductMap.bulkCreate(orderProducts);
      }
      res.status(201).json(order);
  } catch (error) {
      res.status(500).json({ error: 'Failed to create order' });
  }
});

// PUT update an order
app.put('/api/orders/:id', async (req, res) => {
  try {
      const { orderDescription, productIds } = req.body;
      const order = await Order.findByPk(req.params.id);
      if (!order) {
          return res.status(404).json({ error: 'Order not found' });
      }
      await order.update({ orderDescription });
      if (productIds) {
          await OrderProductMap.destroy({ where: { orderId: order.id } });
          const orderProducts = productIds.map(productId => ({ orderId: order.id, productId }));
          await OrderProductMap.bulkCreate(orderProducts);
      }
      res.json(order);
  } catch (error) {
      res.status(500).json({ error: 'Failed to update order' });
  }
});

// DELETE an order
app.delete('/api/orders/:id', async (req, res) => {
  try {
      const order = await Order.findByPk(req.params.id);
      if (!order) {
          return res.status(404).json({ error: 'Order not found' });
      }
      await OrderProductMap.destroy({ where: { orderId: order.id } });
      await order.destroy();
      res.status(204).send();
  } catch (error) {
      res.status(500).json({ error: 'Failed to delete order' });
  }
});
//GET all products
app.get('/api/products', async (req,res)=>{
    try {
        const product = await Product.findAll({});
        res.json(product);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch products' });
    }
})
// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
