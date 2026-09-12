const PosicionModel = require("../models/posicion.model");

class PosicionRepository {
  async upsert(posicion) {
    const resultado = await PosicionModel.findOneAndUpdate(
      {
        torneo: posicion.torneo,
        establecimiento: posicion.establecimiento,
        posicion: posicion.posicion,
      },
      {},
      { new: true, upsert: true }
    );
    return resultado ? resultado.toObject() : null;
  }

  async obtenerPorTorneo(torneoId) {
    return PosicionModel.find({ torneo: torneoId })
      .populate("establecimiento")
      .sort({ posicion: 1 })
      .lean();
  }

  async reemplazarPorTorneo(torneoId, posiciones) {
    await PosicionModel.deleteMany({ torneo: torneoId });
    if (posiciones.length) {
      return PosicionModel.insertMany(posiciones);
    }
    return [];
  }
}

module.exports = PosicionRepository;