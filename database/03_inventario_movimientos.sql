-- Tabla de movimientos de inventario
CREATE TABLE IF NOT EXISTS inventario_movimientos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  producto_id UUID NOT NULL REFERENCES productos(id),
  tipo_movimiento VARCHAR(20) NOT NULL
    CHECK (tipo_movimiento IN ('ENTRADA','SALIDA','AJUSTE','TRASLADO','DEVOLUCION')),
  cantidad DECIMAL(12,3) NOT NULL,
  stock_anterior DECIMAL(12,3) NOT NULL,
  stock_nuevo DECIMAL(12,3) NOT NULL,
  motivo TEXT,
  referencia VARCHAR(100),
  usuario_email VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Función para registrar movimiento y actualizar stock atómicamente
CREATE OR REPLACE FUNCTION registrar_movimiento_inventario(
  p_producto_id UUID,
  p_tipo VARCHAR,
  p_cantidad DECIMAL,
  p_motivo TEXT,
  p_referencia VARCHAR,
  p_usuario VARCHAR
)
RETURNS JSONB LANGUAGE plpgsql AS $$
DECLARE
  v_stock_anterior DECIMAL;
  v_stock_nuevo DECIMAL;
BEGIN
  SELECT stock_actual INTO v_stock_anterior
  FROM productos WHERE id = p_producto_id FOR UPDATE;

  IF p_tipo IN ('ENTRADA', 'AJUSTE') THEN
    v_stock_nuevo := v_stock_anterior + p_cantidad;
  ELSE
    v_stock_nuevo := v_stock_anterior - p_cantidad;
  END IF;

  IF v_stock_nuevo < 0 AND p_tipo = 'SALIDA' THEN
    RAISE EXCEPTION 'Stock insuficiente. Stock actual: %', v_stock_anterior;
  END IF;

  UPDATE productos SET stock_actual = v_stock_nuevo WHERE id = p_producto_id;

  INSERT INTO inventario_movimientos (
    producto_id, tipo_movimiento, cantidad,
    stock_anterior, stock_nuevo, motivo, referencia, usuario_email
  ) VALUES (
    p_producto_id, p_tipo, p_cantidad,
    v_stock_anterior, v_stock_nuevo, p_motivo, p_referencia, p_usuario
  );

  RETURN jsonb_build_object(
    'stock_anterior', v_stock_anterior,
    'stock_nuevo', v_stock_nuevo,
    'movimiento', p_tipo
  );
END;
$$;
