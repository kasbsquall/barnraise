-- El Libro del Barrio: registro compartido de la cooperacion real.
-- No pertenece a ninguna organizacion. Es el activo colectivo que despues
-- sirve como evidencia de colaboracion ante los financiadores.

CREATE TABLE IF NOT EXISTS acuerdos (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    fecha               TEXT NOT NULL,          -- ISO 8601
    org_solicitante     TEXT NOT NULL,          -- org_id de quien inicio
    org_proveedora      TEXT NOT NULL,          -- org_id de la contraparte
    recurso_entregado   TEXT NOT NULL,          -- lo que dio la proveedora
    recurso_recibido    TEXT NOT NULL,          -- lo que dio la solicitante a cambio
    condiciones         TEXT NOT NULL,          -- dia, horario, detalles
    necesidad_cubierta  TEXT NOT NULL,          -- id + descripcion de la necesidad atendida
    estado              TEXT NOT NULL           -- propuesto | aprobado | rechazado | cumplido
        CHECK (estado IN ('propuesto', 'aprobado', 'rechazado', 'cumplido')),
    resultado           TEXT                    -- que paso al ejecutarse
);

-- Cada aprobacion humana queda registrada por separado: un acuerdo solo pasa a
-- 'aprobado' cuando existen las dos aprobaciones, una por cada organizacion.
CREATE TABLE IF NOT EXISTS aprobaciones (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    acuerdo_id  INTEGER NOT NULL REFERENCES acuerdos(id),
    org_id      TEXT NOT NULL,
    decision    TEXT NOT NULL CHECK (decision IN ('aprobado', 'rechazado')),
    aprobador   TEXT NOT NULL,      -- nombre de la persona que decidio
    fecha       TEXT NOT NULL,
    comentario  TEXT,
    UNIQUE (acuerdo_id, org_id)
);

CREATE INDEX IF NOT EXISTS idx_acuerdos_orgs ON acuerdos(org_solicitante, org_proveedora);
CREATE INDEX IF NOT EXISTS idx_acuerdos_estado ON acuerdos(estado);

-- Coaliciones: una postulacion conjunta a una convocatoria. Solo pasa a
-- 'aprobada' cuando TODAS las organizaciones participantes aprobaron.
CREATE TABLE IF NOT EXISTS coaliciones (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    fecha           TEXT NOT NULL,
    convocatoria_id TEXT NOT NULL,
    convocatoria    TEXT NOT NULL,
    monto           INTEGER NOT NULL,
    org_ids         TEXT NOT NULL,      -- separados por coma
    roles           TEXT NOT NULL,      -- que hace cada organizacion
    presupuesto     TEXT NOT NULL,      -- como se reparte el monto
    evidencia       TEXT NOT NULL,      -- historial del Libro que la sustenta
    estado          TEXT NOT NULL
        CHECK (estado IN ('propuesta', 'aprobada', 'rechazada'))
);

CREATE TABLE IF NOT EXISTS aprobaciones_coalicion (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    coalicion_id INTEGER NOT NULL REFERENCES coaliciones(id),
    org_id       TEXT NOT NULL,
    decision     TEXT NOT NULL CHECK (decision IN ('aprobado', 'rechazado')),
    aprobador    TEXT NOT NULL,
    fecha        TEXT NOT NULL,
    comentario   TEXT,
    UNIQUE (coalicion_id, org_id)
);
