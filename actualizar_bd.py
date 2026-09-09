import sqlite3


conn = sqlite3.connect('instance/sistema_academico.db')
cursor = conn.cursor()

cursor.execute("UPDATE asistencias_diarias SET estado = 'Inasistencia Reportada' WHERE estado = 'Ausente'")

conn.commit()
print(f"¡Éxito! Se han actualizado {cursor.rowcount} registros.")
conn.close()