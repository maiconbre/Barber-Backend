const { DataTypes } = require('sequelize');
const sequelize = require('./database');

const Barber = sequelize.define('Barber', {
  id: {
    type: DataTypes.STRING,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  whatsapp: {
    type: DataTypes.STRING,
    allowNull: false
  },
  pix: {
    type: DataTypes.STRING,
    allowNull: false
  }
});

// Static method to create a new barber
Barber.createBarber = async function(barberData) {
  try {
    const barber = await this.create({
      id: barberData.id || Date.now().toString(),
      name: barberData.name,
      whatsapp: barberData.whatsapp,
      pix: barberData.pix
    });
    return barber;
  } catch (error) {
    throw new Error(`Error creating barber: ${error.message}`);
  }
};

module.exports = Barber;