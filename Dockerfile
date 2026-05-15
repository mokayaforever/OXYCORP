FROM node:20-bullseye-slim

RUN apt-get update && apt-get install -y python3 python3-pip && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json ./
COPY requirements.txt ./

RUN npm install
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 3000
ENV PORT=3000
CMD ["sh", "-c", "npm run all"]
