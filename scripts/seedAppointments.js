const Appointment = require('../models/Appointment');
const sequelize = require('../models/database');

const seedAppointments = async () => {
  try {
    await sequelize.sync();
    await Appointment.destroy({ where: {}, truncate: true });

    const specificDates = [];
    const today = new Date();
    // Gera datas de 15 dias atrás até 15 dias à frente
    for (let i = -15; i <= 15; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      specificDates.push(date.toISOString().split('T')[0]);
    }

    const services = [
      { name: 'Corte de Cabelo', price: 30 },
      { name: 'Corte e Barba', price: 45 },
      { name: 'Degradê', price: 35 },
      { name: 'Hidratação', price: 40 },
      { name: 'Barba', price: 25 },
      { name: 'Coloração', price: 70 },
      { name: 'Corte Navalhado', price: 40 },
      { name: 'Platinado', price: 80 },
      { name: 'Progressiva', price: 120 }
    ];

    const clientNames = [
      'João Silva', 'Maria Oliveira', 'Pedro Santos', 'Ana Ferreira',
      'Carlos Rodrigues', 'Juliana Costa', 'Roberto Almeida', 'Patricia Lima',
      'Lucas Mendes', 'Fernanda Santos', 'Ricardo Oliveira', 'Camila Costa',
      'Bruno Ferreira', 'Amanda Silva', 'Diego Santos', 'Larissa Oliveira',
      'Thiago Lima', 'Mariana Costa', 'Gabriel Almeida'
    ];

    const barbers = [
      { id: '01', name: 'joao' },
      { id: '02', name: 'Pedro' },
      { id: '03', name: 'Gabrielle' },
      { id: '04', name: 'Marcos' }
    ];

    let idCounter = 1;
    const appointments = [];
    const appointmentsPerBarber = 50;

    // Horários disponíveis fixos
    const availableHours = ['09:00', '10:00', '11:00', '12:00', '13:00', 
                           '14:00', '15:00', '16:00', '17:00', '18:00', 
                           '19:00', '20:00'];

    barbers.forEach(barber => {
      let barberAppointments = 0;
      
      // Distribuir agendamentos uniformemente entre as datas
      specificDates.forEach(date => {
        if (barberAppointments >= appointmentsPerBarber) return;

        // Escolher horários aleatórios para cada data
        const shuffledHours = [...availableHours].sort(() => Math.random() - 0.5);
        
        // Criar 2-3 agendamentos por dia
        const appointmentsForDay = Math.floor(Math.random() * 2) + 2;
        
        for (let i = 0; i < appointmentsForDay && barberAppointments < appointmentsPerBarber; i++) {
          const service = services[Math.floor(Math.random() * services.length)];
          const uniqueId = `${Date.now()}-${idCounter++}`;
          const clientName = clientNames[Math.floor(Math.random() * clientNames.length)];
          const time = shuffledHours[i];

          // Determinar status baseado na data
          const appointmentDate = new Date(date);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const status = appointmentDate < today ? 'completed' : 'pending';

          appointments.push({
            id: uniqueId,
            clientName,
            serviceName: service.name,
            date,
            time,
            status,
            barberId: barber.id,
            barberName: barber.name,
            price: service.price
          });

          barberAppointments++;
        }
      });
    });

    // Ordenar appointments por data e hora
    appointments.sort((a, b) => {
      const dateCompare = a.date.localeCompare(b.date);
      return dateCompare || a.time.localeCompare(b.time);
    });

    await Appointment.bulkCreate(appointments, { validate: true });
    console.log(`Total de agendamentos criados: ${appointments.length}`);
    console.log('Agendamentos inseridos com sucesso!');

    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('Erro ao criar agendamentos:', error);
    await sequelize.close();
    process.exit(1);
  }
};

seedAppointments();
