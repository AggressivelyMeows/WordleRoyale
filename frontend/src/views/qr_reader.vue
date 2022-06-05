<template>
    <div class="">
        <h4 class="text-primary-400 text-3xl font-extrabold">
            QR Scanner
        </h4>

        <p class="text-gray-200">
            Dont want to share URL to join the lobby? Just show your phone to the QR code and you'll join instantly.
        </p>

        <p class="text-primary-400 mt-2 font-bold" v-if="error">
            {{error}}
        </p>

        <video ref="video" class="rounded-md mt-4 oveflow-hidden w-full"></video>
    </div>
</template>

<script>
    import QrScanner from 'qr-scanner'

    export default {
        data: () => ({
            error: ''
        }),
        async mounted() {
            console.log(await QrScanner.listCameras(true))
            const qrScanner = new QrScanner(this.$refs.video, result => console.log('decoded qr code:', result));
            qrScanner.start()

            setInterval(() => {
                QrScanner.scanImage(this.$refs.video)
                    .then(result => {
                        if (result.includes('wordful')) {
                            window.location = result
                        } else {
                            this.error = `This URL does not belong to Wordful. Please try again.`
                        }
                    })
                    .catch(error => {
                        this.log.push(`Error: ${error.toString() || 'No QR found'}`)
                    });
            }, 1000)
        }
    }
</script>