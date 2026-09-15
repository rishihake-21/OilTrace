FROM python:3.8.10-slim

WORKDIR /app

# install linux package dependencies
RUN apt-get -y update

# can copy files only from current working directory where docker builds
# cannot copy files from arbitrary directories

COPY ./resnet_50_deeplab_v3+/oil_spill_seg_resnet_50_deeplab_v3+_80.pt /data/models/oil_spill_seg_resnet_50_deeplab_v3+_80.pt
COPY ./sample_image_for_inference/img_0814.jpg /data/images/img_0814.jpg
COPY ./requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

# User
RUN useradd -m -u 1000 user
USER user
ENV HOME /home/user
ENV PATH $HOME/.local/bin:$PATH

WORKDIR $HOME
RUN mkdir app
WORKDIR $HOME/app


COPY ./training/__init__.py $HOME/app/training/
COPY ./training/dataset.py $HOME/app/training/
COPY ./training/encoder_models.py $HOME/app/training/
COPY ./training/decoder_models.py $HOME/app/training/
COPY ./training/image_preprocessing.py $HOME/app/training/
COPY ./training/logger_utils.py $HOME/app/training/
COPY ./training/metrics.py $HOME/app/training/
COPY ./training/seg_models.py $HOME/app/training/
COPY ./training/image_stats.json $HOME/app/training/
COPY ./app.py $HOME/app

EXPOSE 8501

CMD streamlit run app.py \
    --server.headless true \
    --server.enableCORS false \
    --server.enableXsrfProtection false \
    --server.fileWatcherType none
