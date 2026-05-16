from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie

# 1. Pegamos la cadena de conexión de Atlas directamente como texto (Hardcoded)
MONGO_URL = "mongodb+srv://atrium_user:CObrQRf9dzAPIWQn@cluster0.egkcnqp.mongodb.net/?appName=Cluster0"
DATABASE_NAME = "atrium_catalogo"

# 2. Inicializar el cliente asíncrono de Motor
client = AsyncIOMotorClient(MONGO_URL)
client.append_metadata = lambda *args, **kwargs: None

db = client[DATABASE_NAME]

# 3. Función de inicialización para FastAPI
async def init_db():
    try:
        await init_beanie(
            database=db,
            document_models=[]  # Se queda vacío por ahora hasta crear los modelos
        )
        print("\n🟢 ==================================================")
        print("🚀 [CONEXIÓN] ¡Conectado con éxito a MongoDB Atlas!")
        print(f"📁 [BASE DE DATOS] Usando: {DATABASE_NAME}")
        print("====================================================\n")
    except Exception as e:
        print("\n🔴 ==================================================")
        print(f"❌ [ERROR] No se pudo conectar a MongoDB: {e}")
        print("====================================================\n")